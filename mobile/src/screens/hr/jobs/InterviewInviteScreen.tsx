import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Button } from '../../../components/common/Button';
import { RichEditor, RichToolbar } from 'react-native-pell-rich-editor';
import { COLORS } from '../../../constants';
import { useNavigation, useRoute } from '@react-navigation/native';
import { mailService } from '../../../services/mailService';
import { useAppSelector } from '@/store/hooks';

const InterviewInviteScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, job, company, email } = (route.params as any) || {};
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const hrEmail = useAppSelector((state) => state.auth.user?.email);
  const [content, setContent] = useState(() => {
    return `Kính gửi ${user?.name || 'ứng viên'},<br/><br/>Công ty <b>${company?.name || ''}</b> xin trân trọng mời bạn tham gia buổi phỏng vấn cho vị trí <b>${job?.name || ''}</b>.<br/><br/>Địa điểm: [Nhập địa chỉ phỏng vấn]<br/>Thời gian: [Nhập thời gian phỏng vấn]<br/><br/>Vui lòng phản hồi email: ${hrEmail} để xác nhận tham gia.<br/><br/>Trân trọng,<br/>${company?.name || ''}`;
  });
  const editor = useRef<RichEditor>(null);

  const handleSend = async () => {
    if (!content || !email) {
      setError('Vui lòng nhập đủ nội dung và email ứng viên');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await mailService.sendInterviewInvite({
        email,
        subject: `Thư mời phỏng vấn từ ${company?.name || ''}`,
        content,
      });
      Alert.alert('Thành công', 'Đã gửi thư mời phỏng vấn cho ứng viên!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      setError(err?.message || 'Gửi mail thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gửi thư mời phỏng vấn</Text>
      <RichEditor
        ref={editor}
        placeholder="Nhập nội dung thư mời..."
        style={styles.richEditor}
        initialHeight={220}
        initialContentHTML={content}
        onChange={setContent}
      />
      <RichToolbar editor={editor} style={styles.richToolbar} />
      {error ? <Text style={{ color: 'red', marginTop: 8 }}>{error}</Text> : null}
      <Button
        title="Gửi thư mời"
        onPress={handleSend}
        loading={loading}
        style={styles.sendButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  title: { fontWeight: '700', fontSize: 20, marginBottom: 16 },
  richEditor: {
    minHeight: 220,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
  },
  richToolbar: {
    borderTopWidth: 1,
    borderColor: COLORS.gray[200],
  },
  sendButton: { marginTop: 20 },
});

export default InterviewInviteScreen;
