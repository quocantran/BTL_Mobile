import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants';
import { IJob } from '../../types';

interface JobCardProps {
  job: IJob;
  onPress: () => void;
  onSave?: () => void;
  isSaved?: boolean;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  onPress,
  onSave,
  isSaved = false,
}) => {
  const formatSalary = (salary: string | number) => {
    const num = Number(salary);
    if (isNaN(num)) return salary.toString();
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(0)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num.toString();
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Image
          source={{ uri: job.company?.logo || 'https://via.placeholder.com/50' }}
          style={styles.logo}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.title} numberOfLines={2}>
            {job.name}
          </Text>
          <Text style={styles.company} numberOfLines={1}>
            {job.company?.name || 'Công ty'}
          </Text>
        </View>
        {onSave && (
          <TouchableOpacity onPress={onSave} style={styles.saveButton}>
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={isSaved ? COLORS.primary : COLORS.gray[400]}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tags}>
        <View style={styles.tag}>
          <Ionicons name="location-outline" size={14} color={COLORS.gray[500]} />
          <Text style={styles.tagText}>{job.location}</Text>
        </View>
        <View style={styles.tag}>
          <Ionicons name="cash-outline" size={14} color={COLORS.gray[500]} />
          <Text style={styles.tagText}>{formatSalary(job.salary)} VND</Text>
        </View>
        <View style={styles.tag}>
          <Ionicons name="briefcase-outline" size={14} color={COLORS.gray[500]} />
          <Text style={styles.tagText}>{job.level}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.skills}>
          {job.skills?.slice(0, 3).map((skill, index) => (
            <View key={index} style={styles.skillTag}>
              <Text style={styles.skillText}>
                {typeof skill === 'string' ? skill : skill.name}
              </Text>
            </View>
          ))}
          {job.skills && job.skills.length > 3 && (
            <Text style={styles.moreSkills}>+{job.skills.length - 3}</Text>
          )}
        </View>
        {job.isActive && (
          <View style={styles.activeTag}>
            <Text style={styles.activeText}>Đang tuyển</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: 4,
  },
  company: {
    fontSize: SIZES.sm,
    color: COLORS.gray[500],
  },
  saveButton: {
    padding: 4,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  tagText: {
    fontSize: SIZES.sm,
    color: COLORS.gray[600],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  skills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  skillTag: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  skillText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  moreSkills: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginLeft: 4,
  },
  activeTag: {
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '500',
  },
});
