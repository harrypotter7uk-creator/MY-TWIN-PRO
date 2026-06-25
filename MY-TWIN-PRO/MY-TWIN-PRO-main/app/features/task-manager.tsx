import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Modal, Alert, Animated, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTwinStore } from '../../store/useTwinStore';
import { useTheme } from '../../utils/theme';
import { router } from 'expo-router';
import { apiGet, apiPost } from '../../lib/httpClient';
import {
  ArrowLeft, Plus, CheckCircle2, Circle, Trash2, Target,
  Cloud, TrendingUp, DollarSign, X, Calendar, Check,
} from 'lucide-react-native';

const T = {
  ar: {
    title: 'المساعد الشخصي', newTask: 'مهمة جديدة', taskPlaceholder: 'عنوان المهمة',
    priority: 'الأولوية', low: 'منخفض', medium: 'متوسط', high: 'عالي',
    save: 'حفظ', saving: 'جاري الحفظ...', empty: 'لا توجد مهام بعد',
    loading: 'جاري التحميل...', completed: 'مكتمل', active: 'نشط',
    weather: 'الطقس', news: 'أخبار', currency: 'عملات', services: 'الخدمات السريعة',
    tasks: 'مهام', done: 'مكتملة', pending: 'معلقة',
  },
  en: {
    title: 'P.A.S.S.', newTask: 'New Task', taskPlaceholder: 'Task title',
    priority: 'Priority', low: 'Low', medium: 'Medium', high: 'High',
    save: 'Save', saving: 'Saving...', empty: 'No tasks yet',
    loading: 'Loading...', completed: 'Completed', active: 'Active',
    weather: 'Weather', news: 'News', currency: 'Currency', services: 'Quick Services',
    tasks: 'Tasks', done: 'Done', pending: 'Pending',
  },
};

export default function TaskManager() {
  const insets = useSafeAreaInsets();
  const { lang, userId } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = useTheme().isDark;
  const t = T[lang] || T['ar'];

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [saving, setSaving] = useState(false);
  const [showServices, setShowServices] = useState(false);
  const [weather, setWeather] = useState<any>(null);

  const colors = {
    bg: isDark ? '#0A0014' : '#FAFAF8', card: isDark ? '#1A1226' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#2D2D2D', subtext: isDark ? '#A78BFA' : '#6B7280',
    accent: '#F97316', accentLight: '#F9731620', border: isDark ? '#2D1B4D' : '#E8E8E3',
    inputBg: isDark ? '#161122' : '#FDFDF9', success: '#10B981', danger: '#EF4444',
  };

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try { const res = await apiGet(`/api/tasks?user_id=${userId}`); setTasks(res?.tasks || res || []); }
    catch (e) { setTasks([]); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { fetchTasks(); }, []);

  const handleAddTask = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      await apiPost('/api/tasks/create', { user_id: userId, title: newTitle.trim(), priority: newPriority });
      setNewTitle(''); setShowAddModal(false); fetchTasks();
    } catch (e) { Alert.alert(isAr ? 'خطأ' : 'Error', isAr ? 'فشل الحفظ' : 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleComplete = async (taskId: string) => {
    try { await apiPost('/api/tasks/complete', { user_id: userId, task_id: taskId }); fetchTasks(); }
    catch (e) {}
  };

  if (loading) {
    return (
      <View style={[st.root, { paddingTop: insets.top, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[st.root, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <View style={[st.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}><ArrowLeft size={24} stroke={colors.text} /></TouchableOpacity>
        <Text style={[st.headerTitle, { color: colors.text }]}>{t.title}</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={[st.addBtn, { backgroundColor: colors.accent }]}><Plus size={22} stroke="#FFF" /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={st.content}>
        <View style={[st.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={st.statItem}><Text style={[st.statValue, { color: colors.accent }]}>{tasks.length}</Text><Text style={[st.statLabel, { color: colors.subtext }]}>{t.tasks}</Text></View>
          <View style={st.statItem}><Text style={[st.statValue, { color: colors.success }]}>{tasks.filter(t => t.status === 'completed').length}</Text><Text style={[st.statLabel, { color: colors.subtext }]}>{t.done}</Text></View>
          <View style={st.statItem}><Text style={[st.statValue, { color: colors.danger }]}>{tasks.filter(t => t.status === 'pending').length}</Text><Text style={[st.statLabel, { color: colors.subtext }]}>{t.pending}</Text></View>
        </View>

        {tasks.length === 0 ? (
          <View style={st.emptyContainer}><Target size={48} stroke={colors.subtext} /><Text style={[st.emptyText, { color: colors.subtext }]}>{t.empty}</Text></View>
        ) : (
          tasks.map(task => (
            <TouchableOpacity key={task.id} style={[st.taskCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => handleComplete(task.id)}>
              {task.status === 'completed' ? <CheckCircle2 size={22} stroke={colors.success} /> : <Circle size={22} stroke={colors.subtext} />}
              <Text style={[st.taskTitle, { color: colors.text, textDecorationLine: task.status === 'completed' ? 'line-through' : 'none' }]}>{task.title}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={st.modalOverlay}>
          <View style={[st.modalContent, { backgroundColor: colors.card }]}>
            <View style={st.modalHeader}><Text style={[st.modalTitle, { color: colors.text }]}>{t.newTask}</Text><TouchableOpacity onPress={() => setShowAddModal(false)}><X size={22} stroke={colors.subtext} /></TouchableOpacity></View>
            <TextInput style={[st.modalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholder={t.taskPlaceholder} placeholderTextColor={colors.subtext} value={newTitle} onChangeText={setNewTitle} autoFocus />
            <Text style={[st.label, { color: colors.subtext }]}>{t.priority}</Text>
            <View style={st.priorityRow}>
              {['low', 'medium', 'high'].map(p => (
                <TouchableOpacity key={p} style={[st.priorityBtn, { borderColor: newPriority === p ? colors.accent : colors.border }, newPriority === p && { backgroundColor: colors.accentLight }]} onPress={() => setNewPriority(p)}>
                  <Text style={[st.priorityBtnText, { color: newPriority === p ? colors.accent : colors.subtext }]}>{t[p as keyof typeof t] || p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[st.saveBtn, { backgroundColor: colors.accent, opacity: newTitle.trim() ? 1 : 0.6 }]} onPress={handleAddTask} disabled={saving || !newTitle.trim()}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={st.saveBtnText}>{t.save}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: '700' }, addBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingBottom: 50 },
  statsRow: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 20 }, statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' }, statLabel: { fontSize: 12, marginTop: 4 },
  emptyContainer: { alignItems: 'center', marginTop: 40 }, emptyText: { fontSize: 15, marginTop: 12 },
  taskCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  taskTitle: { fontSize: 15, fontWeight: '600', flex: 1 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '90%', borderRadius: 20, padding: 24 }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700' }, modalInput: { borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 }, priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  priorityBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 }, priorityBtnText: { fontSize: 12, fontWeight: '500' },
  saveBtn: { padding: 14, borderRadius: 12, alignItems: 'center' }, saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
