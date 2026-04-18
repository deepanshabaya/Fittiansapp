import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { WebView } from 'react-native-webview';

export default function TrainerCard({ trainer }) {
  if (!trainer) return null;

  const getEmbedUrl = (url) => {
    if (!url) return null;
    if (url.includes('/shorts/')) {
      const videoId = url.split('/shorts/')[1].split('?')[0];
      return `https://www.youtube.com/embed/${videoId}?rel=0`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1].split('?')[0];
      return `https://www.youtube.com/embed/${videoId}?rel=0`;
    }
    if (url.includes('watch?v=')) {
      const videoId = url.split('v=')[1].split('&')[0];
      return `https://www.youtube.com/embed/${videoId}?rel=0`;
    }
    return url;
  };

  // Use the provided youtube shorts url if trainer lacks an intro video for demo presentation
  const videoUrl = getEmbedUrl(trainer.introduction_video_url || 'https://www.youtube.com/@Fittians');

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {trainer.profile_photo_url ? (
          <Image source={{ uri: trainer.profile_photo_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholderAvatar]}>
            <Text style={styles.avatarInitial}>
              {(trainer.name || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.headerText}>
          <Text style={styles.name}>{trainer.name}</Text>
          {trainer.experience_years != null && (
            <Text style={styles.meta}>{trainer.experience_years} years experience</Text>
          )}
          {trainer.specialization && (
            <Text style={styles.meta}>Specialization: {trainer.specialization}</Text>
          )}
        </View>
      </View>
      {(trainer.certifications && trainer.certifications.length > 0) && (
        <Text style={styles.certifications}>
          <Text style={{fontWeight: 'bold', color: '#FFFFFF'}}>Certifications:</Text> {Array.isArray(trainer.certifications) ? trainer.certifications.join(', ') : trainer.certifications}
          {trainer.certification_academy
            ? ` (${trainer.certification_academy})`
            : ''}
        </Text>
      )}
      {videoUrl && (
        <View style={styles.videoContainer}>
          <Text style={styles.videoTitle}>Trainer Introduction</Text>
          <WebView
            source={{ uri: videoUrl }}
            style={styles.webview}
            allowsFullscreenVideo={true}
            mediaPlaybackRequiresUserAction={false}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#FFC107',
  },
  placeholderAvatar: {
    backgroundColor: '#FFC107',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: '#121212',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFC107',
  },
  meta: {
    fontSize: 14,
    color: '#E0E0E0',
    marginTop: 4,
  },
  certifications: {
    marginTop: 12,
    fontSize: 14,
    color: '#A0A0A0',
    lineHeight: 20,
  },
  videoContainer: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#333333',
  },
  videoTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#1E1E1E',
  },
  webview: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: '#000000',
  },
});

