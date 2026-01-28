import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { usersService } from '../../../services/usersService';
import { IUser } from '../../../types';
import { Loading } from '../../../components/common/Loading';
import { COLORS } from '../../../constants';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

type AdminStackParamList = {
  UsersList: undefined;
  UserForm: undefined;
  UserDetail: { userId: string };
};

const UsersListScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<AdminStackParamList>>();
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await usersService.getUsers();
      setUsers(res.data.result || []);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation]);

  const renderItem = ({ item }: { item: IUser }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => navigation.navigate('UserDetail', { userId: item._id })}
    >
      <Text style={styles.name}>Họ tên: {item.name}</Text>
      <Text style={styles.email}>Email: {item.email}</Text>
      <Text style={styles.role}>Vai trò: {item.role}</Text>
      <Text style={styles.date}>
        Ngày tham gia:{' '}
        {format(new Date(item.createdAt), 'dd/MM/yyyy', { locale: vi })}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <Loading />
      ) : (
        <>
          <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('UserForm')}>
            <Text style={styles.createText}>Tạo người dùng</Text>
          </TouchableOpacity>
          <FlatList data={users} keyExtractor={(i) => i._id} renderItem={renderItem} />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  item: { padding: 12, backgroundColor: COLORS.white, marginBottom: 8, borderRadius: 8 },
  name: { fontSize: 16, fontWeight: '600' },
  email: { color: COLORS.gray[600], marginTop: 4 },
  role: { color: COLORS.gray[600], marginTop: 4 },
  date: { color: COLORS.gray[600], marginTop: 4 },
  createBtn: { padding: 12, backgroundColor: COLORS.primary, borderRadius: 8, marginBottom: 12 },
  createText: { color: COLORS.white, textAlign: 'center', fontWeight: '600' },
});

export default UsersListScreen;
