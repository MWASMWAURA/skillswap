import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { skillsAPI, exchangesAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface SkillDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  requirements?: string;
  duration?: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    bio?: string;
  };
}

export default function SkillDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuthStore();
  const [skill, setSkill] = useState<SkillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    fetchSkillDetail();
  }, [route.params?.id]);

  const fetchSkillDetail = async () => {
    try {
      const response = await skillsAPI.getById(route.params?.id);
      setSkill(response.data);
    } catch (error) {
      console.error('Failed to fetch skill:', error);
      Alert.alert('Error', 'Failed to load skill details');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestExchange = async () => {
    if (!skill) return;

    setRequesting(true);
    try {
      await exchangesAPI.create({
        skillId: skill.id,
        teacherId: skill.user.id,
      });
      Alert.alert('Success', 'Exchange request sent!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to send exchange request');
    } finally {
      setRequesting(false);
    }
  };

  const handleStartChat = () => {
    // Navigate to chat with this user
    navigation.navigate('Chat', { userId: skill?.user.id });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!skill) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Skill not found</Text>
      </View>
    );
  }

  const isOwnSkill = user?.id === skill.user.id;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{skill.category}</Text>
          </View>
          <Text style={styles.title}>{skill.title}</Text>
          <Text style={styles.level}>Level: {skill.level}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{skill.description}</Text>
        </View>

        {skill.requirements && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requirements</Text>
            <Text style={styles.description}>{skill.requirements}</Text>
          </View>
        )}

        {skill.duration && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estimated Duration</Text>
            <Text style={styles.description}>{skill.duration}</Text>
          </View>
        )}

        <View style={styles.instructorSection}>
          <Text style={styles.sectionTitle}>Instructor</Text>
          <View style={styles.instructorCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{skill.user.name[0]}</Text>
            </View>
            <View style={styles.instructorInfo}>
              <Text style={styles.instructorName}>{skill.user.name}</Text>
              {skill.user.bio && (
                <Text style={styles.instructorBio} numberOfLines={2}>
                  {skill.user.bio}
                </Text>
              )}
            </View>
          </View>
        </View>

        {!isOwnSkill && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={handleStartChat}
            >
              <Text style={styles.chatButtonText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.requestButton, requesting && styles.buttonDisabled]}
              onPress={handleRequestExchange}
              disabled={requesting}
            >
              {requesting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.requestButtonText}>Request Exchange</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    padding: 20,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3B82F6',
  },
  header: {
    marginBottom: 24,
  },
  categoryBadge: {
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  level: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
  instructorSection: {
    marginBottom: 24,
  },
  instructorCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  instructorInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  instructorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  instructorBio: {
    fontSize: 14,
    color: '#6B7280',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  chatButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  chatButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  requestButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  requestButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
