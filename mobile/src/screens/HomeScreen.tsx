import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { skillsAPI, exchangesAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface Skill {
  id: string;
  title: string;
  category: string;
  user: {
    name: string;
    avatar?: string;
  };
}

interface Exchange {
  id: string;
  status: string;
  skill: {
    title: string;
  };
  partner: {
    name: string;
  };
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [recentSkills, setRecentSkills] = useState<Skill[]>([]);
  const [activeExchanges, setActiveExchanges] = useState<Exchange[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [skillsRes, exchangesRes] = await Promise.all([
        skillsAPI.getAll({ page: 1 }),
        exchangesAPI.getAll(),
      ]);
      setRecentSkills(skillsRes.data.skills?.slice(0, 5) || []);
      setActiveExchanges(exchangesRes.data.filter((e: Exchange) => e.status === 'active'));
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const renderSkillCard = ({ item }: { item: Skill }) => (
    <TouchableOpacity
      style={styles.skillCard}
      onPress={() => navigation.navigate('SkillDetail', { id: item.id })}
    >
      <Text style={styles.skillTitle}>{item.title}</Text>
      <Text style={styles.skillCategory}>{item.category}</Text>
      <View style={styles.skillUser}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.user.name[0]}</Text>
        </View>
        <Text style={styles.userName}>{item.user.name}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderExchangeCard = ({ item }: { item: Exchange }) => (
    <TouchableOpacity
      style={styles.exchangeCard}
      onPress={() => navigation.navigate('Chat', { exchangeId: item.id })}
    >
      <Text style={styles.exchangeTitle}>{item.skill.title}</Text>
      <Text style={styles.exchangePartner}>with {item.partner.name}</Text>
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>{item.status}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name || 'User'}!</Text>
          <Text style={styles.subGreeting}>Ready to learn something new?</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{user?.name?.[0] || 'U'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <FlatList
        data={[]}
        renderItem={() => null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Skills</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Skills')}>
                  <Text style={styles.seeAll}>See All</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                horizontal
                data={recentSkills}
                renderItem={renderSkillCard}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Active Exchanges</Text>
              {activeExchanges.length > 0 ? (
                activeExchanges.map((exchange) => (
                  <View key={exchange.id}>
                    {renderExchangeCard({ item: exchange })}
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No active exchanges</Text>
                  <TouchableOpacity
                    style={styles.ctaButton}
                    onPress={() => navigation.navigate('Skills')}
                  >
                    <Text style={styles.ctaButtonText}>Find Skills to Learn</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subGreeting: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  seeAll: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  horizontalList: {
    paddingRight: 20,
  },
  skillCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  skillTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  skillCategory: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  skillUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  userName: {
    fontSize: 12,
    color: '#6B7280',
  },
  exchangeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  exchangeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  exchangePartner: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  ctaButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
