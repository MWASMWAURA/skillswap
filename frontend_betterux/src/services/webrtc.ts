import React from 'react';
import SimplePeer from 'simple-peer';
import { useChatStore, useAuthStore, useNotificationStore } from '../store';
import { websocketService } from './websocket';

interface CallState {
  isInCall: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callStartTime: Date | null;
  duration: number;
}

interface WebRTCConfig {
  video: boolean;
  audio: boolean;
  screen: boolean;
}

class WebRTCService {
  private peer: SimplePeer.Instance | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private callInterval: NodeJS.Timeout | null = null;
  private exchangeId: string | null = null;
  private isInitiator = false;

  // Call state management
  private callState: CallState = {
    isInCall: false,
    isMuted: false,
    isVideoOff: false,
    isScreenSharing: false,
    localStream: null,
    remoteStream: null,
    callStartTime: null,
    duration: 0,
  };

  // Configuration
  private config: WebRTCConfig = {
    video: true,
    audio: true,
    screen: false,
  };

  // ICE servers configuration
  private iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Add TURN servers for production
  ];

  constructor() {
    this.setupWebSocketListeners();
  }

  private setupWebSocketListeners() {
    // Listen for WebRTC signaling events via WebSocket
    const socket = websocketService.getSocket();
    if (socket) {
      socket.on('webrtc_offer', this.handleOffer.bind(this));
      socket.on('webrtc_answer', this.handleAnswer.bind(this));
      socket.on('webrtc_ice_candidate', this.handleIceCandidate.bind(this));
      socket.on('call_ended', this.handleCallEnded.bind(this));
    }
  }

  // Initialize media stream
  async initializeMediaStream(config: Partial<WebRTCConfig> = {}): Promise<MediaStream> {
    this.config = { ...this.config, ...config };
    
    try {
      const constraints: MediaStreamConstraints = {
        video: this.config.video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false,
        audio: this.config.audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false,
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.callState.localStream = this.localStream;
      
      return this.localStream;
    } catch (error) {
      console.error('Failed to get user media:', error);
      throw new Error('Failed to access camera/microphone. Please check permissions.');
    }
  }

  // Start a call
  async startCall(exchangeId: string, isInitiator: boolean = true): Promise<void> {
    try {
      this.exchangeId = exchangeId;
      this.isInitiator = isInitiator;
      
      // Initialize media if not already done
      if (!this.localStream) {
        await this.initializeMediaStream();
      }

      // Join the call room
      websocketService.joinCall(exchangeId);

      // Create peer connection
      this.createPeerConnection(isInitiator);

      // Add local stream to peer
      if (this.localStream && this.peer) {
        this.peer.addStream(this.localStream);
      }

      this.callState.isInCall = true;
      this.callState.callStartTime = new Date();
      
      // Start call duration timer
      this.startCallTimer();

      // Show notification
      useNotificationStore.getState().addNotification({
        type: 'system',
        title: 'Call Started',
        message: 'Video call has been initiated',
        data: { type: 'call_started', exchangeId },
      });

    } catch (error) {
      console.error('Failed to start call:', error);
      throw error;
    }
  }

  // Create peer connection
  private createPeerConnection(isInitiator: boolean) {
    this.peer = new SimplePeer({
      initiator: isInitiator,
      trickle: false,
      stream: this.localStream || undefined,
      config: {
        iceServers: this.iceServers,
      },
    });

    this.peer.on('signal', (data: any) => {
      // Send signaling data via WebSocket
      if (this.exchangeId) {
        if (isInitiator) {
          websocketService.sendCallOffer(this.exchangeId, data, ''); // recipientId will be handled by server
        } else {
          websocketService.sendCallAnswer(this.exchangeId, data, ''); // callerId will be handled by server
        }
      }
    });

    this.peer.on('stream', (remoteStream: MediaStream) => {
      this.remoteStream = remoteStream;
      this.callState.remoteStream = remoteStream;
      
      // Update chat store with remote stream
      if (this.exchangeId) {
        const { updateMessage } = useChatStore.getState();
        // Handle remote stream in UI components
      }
    });

    this.peer.on('connect', () => {
      console.log('Peer connection established');
      useNotificationStore.getState().addNotification({
        type: 'system',
        title: 'Connected',
        message: 'Call connection established',
      });
    });

    this.peer.on('error', (error: Error) => {
      console.error('Peer connection error:', error);
      useNotificationStore.getState().addNotification({
        type: 'system',
        title: 'Connection Error',
        message: 'Call connection failed',
      });
      this.endCall('connection_error');
    });

    this.peer.on('close', () => {
      console.log('Peer connection closed');
      this.endCall('peer_disconnected');
    });
  }

  // Handle incoming offer
  private handleOffer(data: { offer: any; exchangeId: string }) {
    if (this.exchangeId !== data.exchangeId) return;
    
    if (this.peer) {
      this.peer.signal(data.offer);
    }
  }

  // Handle incoming answer
  private handleAnswer(data: { answer: any; exchangeId: string }) {
    if (this.exchangeId !== data.exchangeId) return;
    
    if (this.peer) {
      this.peer.signal(data.answer);
    }
  }

  // Handle ICE candidate
  private handleIceCandidate(data: { candidate: any; exchangeId: string }) {
    if (this.exchangeId !== data.exchangeId) return;
    
    if (this.peer) {
      this.peer.signal(data.candidate);
    }
  }

  // Handle call ended
  private handleCallEnded(data: { exchangeId: string; reason?: string }) {
    if (this.exchangeId === data.exchangeId) {
      this.endCall(data.reason || 'remote_ended');
    }
  }

  // Toggle microphone
  toggleMicrophone(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.callState.isMuted = !audioTrack.enabled;
        
        useNotificationStore.getState().addNotification({
          type: 'system',
          title: this.callState.isMuted ? 'Microphone Off' : 'Microphone On',
          message: this.callState.isMuted ? 'You have muted your microphone' : 'You have unmuted your microphone',
        });
        
        return this.callState.isMuted;
      }
    }
    return false;
  }

  // Toggle camera
  toggleCamera(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.callState.isVideoOff = !videoTrack.enabled;
        
        useNotificationStore.getState().addNotification({
          type: 'system',
          title: this.callState.isVideoOff ? 'Camera Off' : 'Camera On',
          message: this.callState.isVideoOff ? 'You have turned off your camera' : 'You have turned on your camera',
        });
        
        return this.callState.isVideoOff;
      }
    }
    return false;
  }

  // Start screen sharing
  async startScreenShare(): Promise<void> {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      // Replace video track in peer connection
      if (this.peer && this.localStream) {
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = this.peer._pc?.getSenders().find((s: any) => 
          s.track && s.track.kind === 'video'
        );
        
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
        
        // Handle screen share end
        videoTrack.onended = () => {
          this.stopScreenShare();
        };
      }

      this.callState.isScreenSharing = true;
      
      useNotificationStore.getState().addNotification({
        type: 'system',
        title: 'Screen Sharing Started',
        message: 'You are now sharing your screen',
      });

    } catch (error) {
      console.error('Failed to start screen sharing:', error);
      throw new Error('Failed to start screen sharing');
    }
  }

  // Stop screen sharing
  async stopScreenShare(): Promise<void> {
    if (this.peer && this.localStream) {
      try {
        // Get camera stream again
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        
        const videoTrack = cameraStream.getVideoTracks()[0];
        const sender = this.peer._pc?.getSenders().find((s: any) => 
          s.track && s.track.kind === 'video'
        );
        
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      } catch (error) {
        console.error('Failed to restore camera:', error);
      }
    }

    this.callState.isScreenSharing = false;
    
    useNotificationStore.getState().addNotification({
      type: 'system',
      title: 'Screen Sharing Stopped',
      message: 'You have stopped screen sharing',
    });
  }

  // End call
  endCall(reason: string = 'user_ended'): void {
    console.log('Ending call:', reason);
    
    // Stop all tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
    }

    // Destroy peer connection
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }

    // Leave call room
    if (this.exchangeId) {
      websocketService.leaveCall(this.exchangeId);
    }

    // Stop timer
    this.stopCallTimer();

    // Reset state
    this.localStream = null;
    this.remoteStream = null;
    this.exchangeId = null;
    this.isInitiator = false;
    
    this.callState = {
      isInCall: false,
      isMuted: false,
      isVideoOff: false,
      isScreenSharing: false,
      localStream: null,
      remoteStream: null,
      callStartTime: null,
      duration: 0,
    };

    // Show notification
    useNotificationStore.getState().addNotification({
      type: 'system',
      title: 'Call Ended',
      message: 'The call has ended',
      data: { type: 'call_ended', reason },
    });
  }

  // Start call duration timer
  private startCallTimer(): void {
    this.callInterval = setInterval(() => {
      if (this.callState.callStartTime) {
        const now = new Date();
        const duration = Math.floor((now.getTime() - this.callState.callStartTime.getTime()) / 1000);
        this.callState.duration = duration;
      }
    }, 1000);
  }

  // Stop call duration timer
  private stopCallTimer(): void {
    if (this.callInterval) {
      clearInterval(this.callInterval);
      this.callInterval = null;
    }
  }

  // Get current call state
  getCallState(): CallState {
    return { ...this.callState };
  }

  // Get local stream
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  // Get remote stream
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  // Check if WebRTC is supported
  static isSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.RTCPeerConnection
    );
  }

  // Request permissions
  static async requestPermissions(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  // Get available devices
  static async getDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices;
    } catch (error) {
      console.error('Failed to get devices:', error);
      return [];
    }
  }

  // Clean up resources
  cleanup(): void {
    this.endCall('cleanup');
  }
}

export const webrtcService = new WebRTCService();

// React hook for WebRTC
export function useWebRTC() {
  const [isSupported, setIsSupported] = React.useState(WebRTCService.isSupported());
  const [permissions, setPermissions] = React.useState(false);
  const [isInitializing, setIsInitializing] = React.useState(false);
  
  const callState = webrtcService.getCallState();

  React.useEffect(() => {
    // Check support on mount
    setIsSupported(WebRTCService.isSupported());
    
    if (isSupported) {
      // Check permissions
      WebRTCService.requestPermissions().then(setPermissions);
    }
  }, [isSupported]);

  const initializeCall = React.useCallback(async (exchangeId: string, isInitiator: boolean = true) => {
    setIsInitializing(true);
    try {
      await webrtcService.startCall(exchangeId, isInitiator);
      return true;
    } catch (error) {
      console.error('Failed to initialize call:', error);
      return false;
    } finally {
      setIsInitializing(false);
    }
  }, []);

  const endCall = React.useCallback((reason?: string) => {
    webrtcService.endCall(reason);
  }, []);

  const toggleMicrophone = React.useCallback(() => {
    return webrtcService.toggleMicrophone();
  }, []);

  const toggleCamera = React.useCallback(() => {
    return webrtcService.toggleCamera();
  }, []);

  const startScreenShare = React.useCallback(async () => {
    try {
      await webrtcService.startScreenShare();
      return true;
    } catch (error) {
      console.error('Failed to start screen share:', error);
      return false;
    }
  }, []);

  const stopScreenShare = React.useCallback(async () => {
    try {
      await webrtcService.stopScreenShare();
      return true;
    } catch (error) {
      console.error('Failed to stop screen share:', error);
      return false;
    }
  }, []);

  const getLocalStream = React.useCallback(() => {
    return webrtcService.getLocalStream();
  }, []);

  const getRemoteStream = React.useCallback(() => {
    return webrtcService.getRemoteStream();
  }, []);

  return {
    isSupported,
    permissions,
    isInitializing,
    callState,
    initializeCall,
    endCall,
    toggleMicrophone,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    getLocalStream,
    getRemoteStream,
    requestPermissions: () => WebRTCService.requestPermissions().then(setPermissions),
    getDevices: WebRTCService.getDevices,
  };
}