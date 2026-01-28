import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants';
import { Button, Input } from '../../components/common';
import { authService } from '../../services/authService';
import { RootStackParamList } from '../../navigation/AppNavigator';

type ForgotPasswordScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;
};

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const [step, setStep] = useState<'email' | 'otp' | 'newPassword'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async () => {
    if (!email) {
      setError('Vui lòng nhập email');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email không hợp lệ');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await authService.forgotPassword(email);
      Alert.alert('Thành công', 'Mã OTP đã được gửi đến email của bạn');
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể gửi OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 4) {
      setError('Vui lòng nhập mã OTP hợp lệ');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await authService.verifyOtp(email, otp);
      setResetToken(response.data?.token || otp);
      setStep('newPassword');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Mã OTP không đúng');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu không khớp');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await authService.resetPassword(resetToken, newPassword);
      Alert.alert('Thành công', 'Mật khẩu đã được đặt lại', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể đặt lại mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <>
      <Text style={styles.description}>
        Nhập email của bạn để nhận mã xác thực đặt lại mật khẩu
      </Text>
      <Input
        label="Email"
        placeholder="Nhập email của bạn"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        error={error}
        leftIcon={<Ionicons name="mail-outline" size={20} color={COLORS.gray[400]} />}
      />
      <Button
        title="Gửi mã OTP"
        onPress={handleSendOTP}
        loading={loading}
        style={styles.button}
      />
    </>
  );

  const renderOTPStep = () => (
    <>
      <Text style={styles.description}>
        Nhập mã OTP đã được gửi đến email {email}
      </Text>
      <Input
        label="Mã OTP"
        placeholder="Nhập mã OTP"
        value={otp}
        onChangeText={setOtp}
        keyboardType="numeric"
        error={error}
        leftIcon={<Ionicons name="keypad-outline" size={20} color={COLORS.gray[400]} />}
      />
      <Button
        title="Xác nhận"
        onPress={handleVerifyOTP}
        loading={loading}
        style={styles.button}
      />
      <TouchableOpacity style={styles.resendButton} onPress={handleSendOTP}>
        <Text style={styles.resendText}>Gửi lại mã OTP</Text>
      </TouchableOpacity>
    </>
  );

  const renderNewPasswordStep = () => (
    <>
      <Text style={styles.description}>Tạo mật khẩu mới cho tài khoản của bạn</Text>
      <Input
        label="Mật khẩu mới"
        placeholder="Nhập mật khẩu mới"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        leftIcon={<Ionicons name="lock-closed-outline" size={20} color={COLORS.gray[400]} />}
      />
      <Input
        label="Xác nhận mật khẩu"
        placeholder="Nhập lại mật khẩu mới"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        error={error}
        leftIcon={<Ionicons name="lock-closed-outline" size={20} color={COLORS.gray[400]} />}
      />
      <Button
        title="Đặt lại mật khẩu"
        onPress={handleResetPassword}
        loading={loading}
        style={styles.button}
      />
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (step === 'email') {
                navigation.goBack();
              } else if (step === 'otp') {
                setStep('email');
              } else {
                setStep('otp');
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.gray[700]} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={
                  step === 'email'
                    ? 'mail'
                    : step === 'otp'
                    ? 'keypad'
                    : 'lock-closed'
                }
                size={40}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.title}>
              {step === 'email'
                ? 'Quên mật khẩu'
                : step === 'otp'
                ? 'Xác thực OTP'
                : 'Mật khẩu mới'}
            </Text>
          </View>

          <View style={styles.form}>
            {step === 'email' && renderEmailStep()}
            {step === 'otp' && renderOTPStep()}
            {step === 'newPassword' && renderNewPasswordStep()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SIZES.padding,
    paddingVertical: 20,
  },
  backButton: {
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  form: {
    flex: 1,
  },
  description: {
    fontSize: SIZES.md,
    color: COLORS.gray[600],
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  button: {
    marginTop: 10,
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  resendText: {
    color: COLORS.primary,
    fontSize: SIZES.md,
    fontWeight: '500',
  },
});

export default ForgotPasswordScreen;
