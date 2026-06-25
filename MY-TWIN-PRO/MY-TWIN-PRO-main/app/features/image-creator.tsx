import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, ScrollView, Animated,
  Dimensions, Alert, FlatList, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTwinStore } from '../../store/useTwinStore';
import { useTheme } from '../../utils/theme';
import { router } from 'expo-router';
import { apiPost } from '../../lib/httpClient';
import {
  Sparkles, ImageIcon, Download, ArrowLeft, RefreshCw,
  Wand2, Lightbulb, Layers, X, Check,
} from 'lucide-react-native';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

const { width: SCREEN_W } = Dimensions.get('window');

const T = {
  ar: {
    title: 'إنشاء صورة', prompt: 'وصف الصورة', placeholder: 'وصف الصورة...',
    generate: 'توليد الصورة', enhance: 'تحسين الوصف', gallery: 'المعرض',
    save: 'حفظ', style: 'النمط', loading: 'جاري التوليد...',
    styles: { realistic: 'واقعي', anime: 'أنمي', oil_painting: 'لوحة زيتية', pixel_art: 'بكسل آرت' },
  },
  en: {
    title: 'Image Creator', prompt: 'Describe the image', placeholder: 'Describe the image...',
    generate: 'Generate Image', enhance: 'Enhance Prompt', gallery: 'Gallery',
    save: 'Save', style: 'Style', loading: 'Generating...',
    styles: { realistic: 'Realistic', anime: 'Anime', oil_painting: 'Oil Painting', pixel_art: 'Pixel Art' },
  },
};

const STYLES = [
  { id: 'realistic', label_ar: 'واقعي', label_en: 'Realistic' },
  { id: 'anime', label_ar: 'أنمي', label_en: 'Anime' },
  { id: 'oil_painting', label_ar: 'لوحة زيتية', label_en: 'Oil Painting' },
  { id: 'pixel_art', label_ar: 'بكسل آرت', label_en: 'Pixel Art' },
];

export default function ImageCreator() {
  const insets = useSafeAreaInsets();
  const { lang, userId } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = useTheme().isDark;
  const t = T[lang] || T['ar'];

  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('realistic');
  const [loading, setLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [gallery, setGallery] = useState<any[]>([]);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const colors = {
    bg: isDark ? '#0A0014' : '#FAFAF8', card: isDark ? '#1A1226' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#2D2D2D', subtext: isDark ? '#A78BFA' : '#6B7280',
    accent: '#8B5CF6', accentLight: '#8B5CF620', border: isDark ? '#2D1B4D' : '#E8E8E3',
    inputBg: isDark ? '#161122' : '#FDFDF9', success: '#10B981',
  };

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setLoading(true); setCurrentImage(null);
    try {
      const result = await apiPost('/api/image-lab/generate', { user_id: userId, prompt: prompt.trim(), style: selectedStyle });
      if (result?.image_url) {
        setCurrentImage(result.image_url);
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        setGallery(prev => [{ prompt: prompt.trim(), image_url: result.image_url, style: selectedStyle }, ...prev].slice(0, 20));
      }
    } catch (e: any) { Alert.alert(isAr ? 'خطأ' : 'Error', e.message); }
    finally { setLoading(false); }
  }, [prompt, selectedStyle, userId]);

  const handleDownload = async () => {
    if (!currentImage) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        const localUri = FileSystem.cacheDirectory + `mytwin-${Date.now()}.png`;
        await FileSystem.downloadAsync(currentImage, localUri);
        await MediaLibrary.saveToLibraryAsync(localUri);
        Alert.alert('✅', isAr ? 'تم الحفظ' : 'Saved!');
      }
    } catch { Alert.alert(isAr ? 'خطأ' : 'Error', isAr ? 'فشل الحفظ' : 'Save failed'); }
  };

  return (
    <View style={[st.root, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <View style={[st.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}><ArrowLeft size={24} stroke={colors.text} /></TouchableOpacity>
        <Text style={[st.headerTitle, { color: colors.text }]}>{t.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={st.content} keyboardShouldPersistTaps="handled">
        <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[st.iconWrap, { backgroundColor: colors.accentLight }]}><Sparkles size={40} stroke={colors.accent} /></View>

          <TouchableOpacity style={[st.stylePicker, { borderColor: colors.border }]} onPress={() => setShowStylePicker(true)}>
            <Layers size={16} stroke={colors.subtext} />
            <Text style={[st.stylePickerText, { color: colors.text }]}>{isAr ? STYLES.find(s => s.id === selectedStyle)?.label_ar : STYLES.find(s => s.id === selectedStyle)?.label_en}</Text>
          </TouchableOpacity>

          <TextInput style={[st.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholder={t.placeholder} placeholderTextColor={colors.subtext} value={prompt} onChangeText={setPrompt} multiline numberOfLines={4} textAlignVertical="top" />

          <TouchableOpacity style={[st.submitBtn, { backgroundColor: colors.accent, opacity: prompt.trim() ? 1 : 0.6 }]} onPress={handleGenerate} disabled={loading || !prompt.trim()}>
            {loading ? <ActivityIndicator color="#FFF" /> : <><Sparkles size={18} stroke="#FFF" /><Text style={st.submitBtnText}>{t.generate}</Text></>}
          </TouchableOpacity>
        </View>

        {currentImage && (
          <Animated.View style={[st.resultCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: fadeAnim }]}>
            <Image source={{ uri: currentImage }} style={st.resultImage} resizeMode="contain" />
            <TouchableOpacity style={[st.saveBtn, { backgroundColor: colors.accentLight }]} onPress={handleDownload}>
              <Download size={18} stroke={colors.accent} /><Text style={[st.saveBtnText, { color: colors.accent }]}>{t.save}</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>

      <Modal visible={showStylePicker} transparent animationType="fade" onRequestClose={() => setShowStylePicker(false)}>
        <TouchableOpacity style={st.modalOverlay} activeOpacity={1} onPress={() => setShowStylePicker(false)}>
          <View style={[st.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[st.modalTitle, { color: colors.text }]}>{isAr ? 'اختر النمط' : 'Select Style'}</Text>
            {STYLES.map(style => (
              <TouchableOpacity key={style.id} style={[st.styleOption, { borderColor: selectedStyle === style.id ? colors.accent : 'transparent' }, selectedStyle === style.id && { backgroundColor: colors.accentLight }]} onPress={() => { setSelectedStyle(style.id); setShowStylePicker(false); }}>
                <Text style={[st.styleOptionText, { color: colors.text }]}>{isAr ? style.label_ar : style.label_en}</Text>
                {selectedStyle === style.id && <Check size={18} stroke={colors.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: '700' }, content: { padding: 20, paddingBottom: 50 },
  card: { borderRadius: 24, padding: 24, borderWidth: 1, alignItems: 'center', marginBottom: 24 },
  iconWrap: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  stylePicker: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 14, padding: 10, paddingHorizontal: 16, marginBottom: 16 },
  stylePickerText: { fontSize: 14, fontWeight: '500' },
  input: { width: '100%', borderRadius: 16, padding: 16, fontSize: 15, borderWidth: 1, minHeight: 100, marginBottom: 16 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, width: '100%', gap: 8 },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  resultCard: { borderRadius: 24, padding: 16, borderWidth: 1, marginBottom: 24 },
  resultImage: { width: '100%', height: SCREEN_W * 0.8, borderRadius: 16, marginBottom: 16 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14 },
  saveBtnText: { fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '80%', borderRadius: 20, padding: 20 }, modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  styleOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 14, borderWidth: 1.5, marginBottom: 8 },
  styleOptionText: { fontSize: 15, fontWeight: '600' },
});
