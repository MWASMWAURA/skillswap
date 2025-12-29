import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  RTCPeerConnection,
  RTCView,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../store/authStore';

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function VideoCallScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { token } = useAuthStore();
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  
  const exchangeId = route.params?.exchangeId;

  useEffect(() => {
    initializeCall();
    
    return () => {
      endCall();
    };
  }, []);

  const initializeCall = async () => {
    try {
      // Get local media stream
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      setLocalStream(stream);

      // Initialize WebRTC peer connection
      const pc = new RTCPeerConnection(configuration);
      peerConnectionRef.current = pc;

      // Add local stream tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
          setIsConnected(true);
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('ice_candidate', {
            exchangeId,
            candidate: event.candidate,
          });
        }
      };

      // Setup signaling
      setupSignaling(pc);
    } catch (error) {
      console.error('Failed to initialize call:', error);
      Alert.alert('Error', 'Failed to access camera/microphone');
      navigation.goBack();
    }
  };

  const setupSignaling = (pc: RTCPeerConnection) => {
    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
    socketRef.current = io(API_URL, {
      auth: { token },
    });

    socketRef.current.on('connect', () => {
      socketRef.current?.emit('join_call', exchangeId);
    });

    socketRef.current.on('call_offer', async (offer) => {
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current?.emit('call_answer', { exchangeId, answer });
    });

    socketRef.current.on('call_answer', async (answer) => {
      await pc.setRemoteDescription(answer);
    });

    socketRef.current.on('ice_candidate', async (candidate) => {
      await pc.addIceCandidate(candidate);
    });

    socketRef.current.on('call_ended', () => {
      Alert.alert('Call Ended', 'The other participant has ended the call');
      navigation.goBack();
    });

    // Create and send offer
    createOffer(pc);
  };

  const createOffer = async (pc: RTCPeerConnection) => {
    try {
      const offer = await pc.createOffer({});
      await pc.setLocalDescription(offer);
      socketRef.current?.emit('call_offer', { exchangeId, offer });
    } catch (error) {
      console.error('Failed to create offer:', error);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleScreenShare = async () => {
    // Screen sharing implementation would require additional native modules
    Alert.alert('Screen Sharing', 'Screen sharing feature coming soon!');
  };

  const switchCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        (track as any)._switchCamera();
      });
    }
  };

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (socketRef.current) {
      socketRef.current.emit('end_call', exchangeId);
      socketRef.current.disconnect();
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.videoContainer}>
        {remoteStream && (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={styles.remoteVideo}
            objectFit="cover"
          />
        )}
        
        {localStream && (
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.localVideo}
            objectFit="cover"
            mirror
          />
        )}

        {!isConnected && (
          <View style={styles.connectingOverlay}>
            <Text style={styles.connectingText}>Connecting...</Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.controlButtonActive]}
          onPress={toggleMute}
        >
          <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🔊'}</Text>
          <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, !isVideoEnabled && styles.controlButtonActive]}
          onPress={toggleVideo}
        >
          <Text style={styles.controlIcon}>{isVideoEnabled ? '📹' : '📷'}</Text>
          <Text style={styles.controlLabel}>{isVideoEnabled ? 'Stop Video' : 'Start Video'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={switchCamera}
        >
          <Text style={styles.controlIcon}>🔄</Text>
          <Text style={styles.controlLabel}>Switch</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isScreenSharing && styles.controlButtonActive]}
          onPress={toggleScreenShare}
        >
          <Text style={styles.controlIcon}>🖥️</Text>
          <Text style={styles.controlLabel}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={endCall}
        >
          <Text style={styles.controlIcon}>📞</Text>
          <Text style={styles.controlLabel}>End</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  localVideo: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    backgroundColor: '#374151',
    overflow: 'hidden',
  },
  connectingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  connectingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#1F2937',
  },
  controlButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    minWidth: 60,
  },
  controlButtonActive: {
    backgroundColor: '#374151',
  },
  controlIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  controlLabel: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  endCallButton: {
    backgroundColor: '#EF4444',
  },
});
