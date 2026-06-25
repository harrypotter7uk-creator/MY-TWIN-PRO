import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, TextInput, Modal, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTwinStore } from '../store/useTwinStore';
import { useTheme } from '../utils/theme';
import { router } from 'expo-router';
import { apiGet, apiPost, apiDelete } from '../lib/httpClient';
import {
  ArrowLeft, Plus, Trash2, FolderOpen, Clock, ChevronRight,
  X, MessageSquare, Layers, RefreshCw, Search, Sparkles,
  Edit3, Check,
} from 'lucide-react-native';

interface ChatProject {
  id: string;
  name: string;
  created_at: string;
  messages: any[];
  preview: string;
}

const T = {
  ar: {
    title: 'مشاريع الوعي',
    subtitle: 'نظّم محادثاتك في مشاريع ليسهل على توأمك تذكرها',
    newProject: 'مشروع جديد',
    projectName: 'اسم المشروع',
    create: 'إنشاء',
    delete: 'حذف',
    deleteConfirm: 'هل تريد حذف هذا المشروع وكل محادثاته؟',
    deleteCancel: 'إلغاء',
    noProjects: 'لا توجد مشاريع بعد',
    noProjectsDesc: 'أنشئ مشروعك الأول لتنظيم وعيك',
    createFirst: 'أنشئ مشروعك الأول',
    messages: 'رسائل',
    currentChat: 'الوعي الحالي',
    searchPlaceholder: 'ابحث عن مشروع...',
    loading: 'جاري تحميل المشاريع...',
    deleteError: 'فشل حذف المشروع',
    createError: 'فشل إنشاء المشروع',
  },
  en: {
    title: 'Mind Projects',
    subtitle: 'Organize your chats into projects for your Twin to remember',
    newProject: 'New Project',
    projectName: 'Project Name',
    create: 'Create',
    delete: 'Delete',
    deleteConfirm: 'Delete this project and all its conversations?',
    deleteCancel: 'Cancel',
    noProjects: 'No projects yet',
    noProjectsDesc: 'Create your first project to organize your mind',
    createFirst: 'Create your first project',
    messages: 'messages',
    currentChat: 'Current Mind',
    searchPlaceholder: 'Search projects...',
    loading: 'Loading projects...',
    deleteError: 'Failed to delete project',
    createError: 'Failed to create project',
  },
};

export default function History() {
  const insets = useSafeAreaInsets();
  const { lang, userId, chatHistory, clearHistory } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = useTheme().isDark;
  const t = T[lang] || T['ar'];

  const [projects, setProjects] = useState<ChatProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const colors = {
    bg: isDark ? '#0A0014' : '#FAFAF8',
    card: isDark ? '#1A1226' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#2D2D2D',
    subtext: isDark ? '#A78BFA' : '#7C6B99',
    accent: '#7C3AED',
    accentLight: '#7C3AED15',
    border: isDark ? '#2D1B4D' : '#E8E8E3',
    inputBg: isDark ? '#161122' : '#FDFDF9',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
  };

  const fetchProjects = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await apiGet(`/api/chat/sessions?user_id=${userId}`);
      if (data?.sessions) {
        setProjects(data.sessions);
      } else {
        const currentChat = chatHistory && chatHistory.length > 0
          ? [{
              id: 'current',
              name: t.currentChat,
              created_at: new Date().toISOString(),
              messages: chatHistory,
              preview: chatHistory.filter(m => m.role === 'user').slice(-1)[0]?.content?.substring(0, 80) || '',
            }]
          : [];
        setProjects(currentChat);
      }
    } catch (e) {
      if (chatHistory && chatHistory.length > 0) {
        setProjects([{
          id: 'current',
          name: t.currentChat,
          created_at: new Date().toISOString(),
          messages: chatHistory,
          preview: chatHistory.filter(m => m.role === 'user').slice(-1)[0]?.content?.substring(0, 80) || '',
        }]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [chatHistory, userId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setCreating(true);
    try {
      await apiPost('/api/chat/sessions', {
        name: newProjectName.trim(),
        user_id: userId,
      });
      setNewProjectName('');
      setShowNewProject(false);
      fetchProjects(true);
    } catch (e) {
      Alert.alert(isAr ? 'خطأ' : 'Error', t.createError);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (projectId === 'current') {
      Alert.alert(isAr ? 'تنبيه' : 'Notice', isAr ? 'لا يمكن حذف الوعي الحالي' : 'Cannot delete current mind');
      return;
    }
    Alert.alert(
      t.delete,
      t.deleteConfirm,
      [
        { text: t.deleteCancel, style: 'cancel' },
        {
          text: t.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              await apiDelete(`/api/chat/sessions/${projectId}`);
              fetchProjects(true);
            } catch (e) {
              Alert.alert(isAr ? 'خطأ' : 'Error', t.deleteError);
            }
          },
        },
      ]
    );
  };

  const handleOpenProject = (project: ChatProject) => {
    if (project.id === 'current') {
      router.push('/chat');
      return;
    }
    if (project.messages && project.messages.length > 0) {
      clearHistory();
      project.messages.forEach((msg: any) => {
        useTwinStore.getState().addMessage({
          id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp || msg.created_at).getTime(),
        });
      });
    }
    router.push('/chat');
  };

  const filteredProjects = searchQuery.trim()
    ? projects.filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : projects;

  if (loading) {
    return (
      <View style={[st.root, { paddingTop: insets.top, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[st.loadingText, { color: colors.subtext, marginTop: 12 }]}>{t.loading}</Text>
      </View>
    );
  }

  return (
    <View style={[st.root, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <View style={[st.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} stroke={colors.text} />
        </TouchableOpacity>
        <Text style={[st.headerTitle, { color: colors.text }]}>{t.title}</Text>
        <TouchableOpacity style={[st.addBtn, { backgroundColor: colors.accent }]} onPress={() => setShowNewProject(true)}>
          <Plus size={22} stroke="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={st.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchProjects(true)} colors={[colors.accent]} />}
      >
        <Text style={[st.subtitle, { color: colors.subtext }]}>{t.subtitle}</Text>

        {projects.length > 3 && (
          <View style={[st.searchWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Search size={18} stroke={colors.subtext} />
            <TextInput
              style={[st.searchInput, { color: colors.text }]}
              placeholder={t.searchPlaceholder}
              placeholderTextColor={colors.subtext}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} stroke={colors.subtext} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {filteredProjects.length === 0 ? (
          <View style={st.emptyContainer}>
            <FolderOpen size={56} stroke={colors.subtext} />
            <Text style={[st.emptyText, { color: colors.subtext }]}>{t.noProjects}</Text>
            <Text style={[st.emptyDesc, { color: colors.subtext }]}>{t.noProjectsDesc}</Text>
            <TouchableOpacity
              style={[st.createBtn, { backgroundColor: colors.accent }]}
              onPress={() => setShowNewProject(true)}
            >
              <Plus size={18} stroke="#FFF" />
              <Text style={st.createBtnText}>{t.createFirst}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredProjects.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[st.projectCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => handleOpenProject(item)}
              activeOpacity={0.8}
            >
              <View style={[st.projectIcon, { backgroundColor: colors.accentLight }]}>
                {item.id === 'current' ? (
                  <Sparkles size={22} stroke={colors.accent} />
                ) : (
                  <Layers size={22} stroke={colors.accent} />
                )}
              </View>
              <View style={st.projectInfo}>
                <Text style={[st.projectName, { color: colors.text }]} numberOfLines={1}>
                  {item.name || t.currentChat}
                </Text>
                <Text style={[st.projectPreview, { color: colors.subtext }]} numberOfLines={2}>
                  {item.preview || (isAr ? 'لا توجد رسائل' : 'No messages')}
                </Text>
                <View style={st.projectMeta}>
                  <Clock size={12} stroke={colors.subtext} />
                  <Text style={[st.projectDate, { color: colors.subtext }]}>
                    {new Date(item.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </Text>
                  <MessageSquare size={12} stroke={colors.subtext} />
                  <Text style={[st.messageCount, { color: colors.subtext }]}>
                    {item.messages?.length || 0} {t.messages}
                  </Text>
                </View>
              </View>
              <View style={st.projectActions}>
                <ChevronRight size={20} stroke={colors.subtext} />
                {item.id !== 'current' && (
                  <TouchableOpacity onPress={() => handleDeleteProject(item.id)} style={st.deleteBtn}>
                    <Trash2 size={16} stroke={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={showNewProject} transparent animationType="fade" onRequestClose={() => setShowNewProject(false)}>
        <TouchableOpacity style={st.modalOverlay} activeOpacity={1} onPress={() => setShowNewProject(false)}>
          <View style={[st.modalContent, { backgroundColor: colors.card }]}>
            <View style={st.modalHeader}>
              <Text style={[st.modalTitle, { color: colors.text }]}>{t.newProject}</Text>
              <TouchableOpacity onPress={() => setShowNewProject(false)}>
                <X size={22} stroke={colors.subtext} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[st.modalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: isAr ? 'right' : 'left' }]}
              placeholder={t.projectName}
              placeholderTextColor={colors.subtext}
              value={newProjectName}
              onChangeText={setNewProjectName}
              autoFocus
            />
            <TouchableOpacity
              style={[st.modalSubmitBtn, { backgroundColor: colors.accent, opacity: newProjectName.trim() && !creating ? 1 : 0.6 }]}
              onPress={handleCreateProject}
              disabled={!newProjectName.trim() || creating}
            >
              {creating ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={st.modalSubmitBtnText}>{t.create}</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  addBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 15 },
  list: { padding: 16, paddingBottom: 40 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 16, gap: 8 },
  searchInput: { flex: 1, fontSize: 15 },
  projectCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 18, borderWidth: 1, marginBottom: 12 },
  projectIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  projectInfo: { flex: 1, marginRight: 8 },
  projectName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  projectPreview: { fontSize: 13, lineHeight: 20, marginBottom: 6 },
  projectMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  projectDate: { fontSize: 11 },
  messageCount: { fontSize: 11, marginLeft: 2 },
  projectActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deleteBtn: { padding: 6, borderRadius: 8 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14 },
  createBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '85%', borderRadius: 20, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalInput: { borderRadius: 14, padding: 16, fontSize: 16, borderWidth: 1, marginBottom: 20 },
  modalSubmitBtn: { padding: 16, borderRadius: 14, alignItems: 'center' },
  modalSubmitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
