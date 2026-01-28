import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { usersService } from '../../../services/usersService';
import { Loading } from '../../../components/common/Loading';
import { COLORS } from '../../../constants';

type RouteParams = {
  params?: {
    userId?: string;
  };
};

const UserFormScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const userId = (route.params as any)?.userId as string | undefined;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'USER' | 'HR' | 'ADMIN'>('USER');
  const [loading, setLoading] = useState(false);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (userId) loadUser();
  }, [userId]);

  const loadUser = async () => {
    setLoading(true);
    try {
      const res = await usersService.getUserById(userId!);
      const u = res.data;
      setName(u.name);
      setRole(u.role);
      setAge(u.age?.toString() || '');
      setGender(u.gender || '');
      setAddress(u.address || '');
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể tải thông tin người dùng');
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (email: string) => {
    // Simple email regex
    return /^\S+@\S+\.\S+$/.test(email);
  };

  const onSubmit = async () => {
    if (!name || (!userId && !email) || (!userId && !password)) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ');
      return;
    }
    if (!userId && !validateEmail(email)) {
      Alert.alert('Lỗi', 'Email không hợp lệ');
      return;
    }
    if (!userId && password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải từ 6 ký tự trở lên');
      return;
    }
    setLoading(true);
    try {
      const payload = { name, role, age: parseInt(age, 10), gender, address };
      if (userId) {
        await usersService.updateUser(userId, payload);
        Alert.alert('Thành công', 'Đã cập nhật');
      } else {
        await usersService.createUser({ ...payload, email, password });
        Alert.alert('Thành công', 'Đã tạo người dùng');
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Lỗi', 'Yêu cầu thất bại');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Họ và tên</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      {!userId && (
        <>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        </>
      )}

      {!userId && (
        <>
          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Tối thiểu 6 ký tự"
            autoCapitalize="none"
          />
        </>
      )}

      <Text style={styles.label}>Tuổi</Text>
      <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" />

      <Text style={styles.label}>Giới tính</Text>
      <TextInput style={styles.input} value={gender} onChangeText={setGender} />

      <Text style={styles.label}>Địa chỉ</Text>
      <TextInput style={styles.input} value={address} onChangeText={setAddress} />

      <Text style={styles.label}>Role</Text>
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        {(['USER', 'HR', 'ADMIN'] as const).map((r) => (
          <TouchableOpacity key={r} style={[styles.roleBtn, role === r && styles.roleActive]} onPress={() => setRole(r)}>
            <Text style={[styles.roleText, role === r && styles.roleTextActive]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={onSubmit}>
        <Text style={styles.submitText}>{userId ? 'Cập nhật' : 'Tạo'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: COLORS.background },
  label: { marginTop: 12, color: COLORS.gray[600] },
  input: { backgroundColor: COLORS.white, padding: 12, borderRadius: 8, marginTop: 8 },
  roleBtn: { padding: 10, borderRadius: 8, backgroundColor: COLORS.white, marginRight: 8 },
  roleActive: { backgroundColor: COLORS.primary },
  roleText: { color: COLORS.gray[700] },
  roleTextActive: { color: COLORS.white },
  submitBtn: { marginTop: 24, backgroundColor: COLORS.primary, padding: 12, borderRadius: 8 },
  submitText: { color: COLORS.white, textAlign: 'center', fontWeight: '600' },
});

export default UserFormScreen;
