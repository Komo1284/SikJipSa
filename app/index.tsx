import { ThemedText } from '@/components/Typography';
import { useAuthStore } from '@/store/auth';
import { useTheme } from '@/theme/ThemeProvider';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

type Step = 'email' | 'code';

export default function Onboarding() {
  const { palette, shadows, weights } = useTheme();
  const router = useRouter();
  const { width, height } = Dimensions.get('window');
  const sendEmailOtp = useAuthStore((s) => s.sendEmailOtp);
  const verifyEmailOtp = useAuthStore((s) => s.verifyEmailOtp);
  const signIn = useAuthStore((s) => s.signIn);
  const session = useAuthStore((s) => s.session);

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const codeInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (session) router.replace('/(tabs)/home');
  }, [session, router]);

  const requestCode = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert('이메일 확인', '올바른 이메일 주소를 입력해주세요.');
      return;
    }
    try {
      setBusy(true);
      await sendEmailOtp(trimmed);
      setEmail(trimmed);
      setStep('code');
      setTimeout(() => codeInputRef.current?.focus(), 250);
    } catch (e) {
      Alert.alert('전송 실패', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    const cleanCode = code.replace(/\s/g, '');
    if (cleanCode.length < 6) {
      Alert.alert('코드 확인', '이메일로 받은 인증 코드를 입력해주세요.');
      return;
    }
    try {
      setBusy(true);
      await verifyEmailOtp(email, cleanCode);
    } catch (e) {
      Alert.alert('인증 실패', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    setStep('email');
    setCode('');
  };

  const signInWithProvider = async (provider: 'google' | 'kakao') => {
    try {
      setBusy(true);
      await signIn(provider);
    } catch (e) {
      const msg = (e as Error).message;
      // Don't pop an alert when the user just dismissed the OAuth sheet.
      if (!/cancel|dismiss/i.test(msg)) {
        Alert.alert('로그인 실패', msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMin slice">
          <Defs>
            <RadialGradient id="halo" cx="50%" cy="30%" rx="80%" ry="80%" fx="50%" fy="30%">
              <Stop offset="0" stopColor={palette.greenSoft} stopOpacity="0.55" />
              <Stop offset="1" stopColor={palette.bg} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#halo)" />
          <Path
            d="M200 60 Q100 100 100 220 Q100 340 230 400 Q360 380 380 230 Q380 100 200 60 Z"
            fill={palette.green}
            opacity="0.88"
            transform={`translate(${-60}, ${-30}) rotate(-18)`}
          />
          <Path
            d="M0 0 Q-50 40 -50 120 Q-30 200 60 220 Q150 210 160 120 Q160 40 0 0 Z"
            fill={palette.greenMoss}
            opacity="0.65"
            transform={`translate(${width - 120}, 360) rotate(35)`}
          />
          <Path
            d="M0 0 Q-30 20 -30 80 Q-15 140 40 150 Q100 140 110 80 Q110 20 0 0 Z"
            fill={palette.earth}
            opacity="0.45"
            transform={`translate(30, ${height - 200}) rotate(-10)`}
          />
        </Svg>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: 28, paddingBottom: 48 }}>
          <ThemedText
            variant="tiny"
            family="mono"
            color={palette.ink3}
            uppercase
            style={{ marginBottom: 14, letterSpacing: 1.3 }}
          >
            SikJipSa · v1.0
          </ThemedText>

          <ThemedText
            family="serif"
            style={{ fontSize: 52, lineHeight: 64, fontFamily: weights.serifRegular, color: palette.ink, letterSpacing: -1 }}
          >
            <ThemedText family="serif" italic style={{ fontSize: 52, lineHeight: 64, color: palette.green, fontFamily: weights.serifItalic }}>
              SikJipSa
            </ThemedText>
            {'\n'}식물과 함께 자라는{'\n'}작은 기록.
          </ThemedText>

          <ThemedText variant="body" color={palette.ink2} style={{ marginTop: 22, marginBottom: 28, maxWidth: 320 }}>
            물주기·비료·분갈이까지 — 내 공간의{'\n'}식물 한 그루 한 그루를 잊지 않도록.
          </ThemedText>

          {step === 'email' ? (
            <>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="이메일 주소"
                placeholderTextColor={palette.ink3}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                inputMode="email"
                returnKeyType="go"
                onSubmitEditing={requestCode}
                editable={!busy}
                style={{
                  paddingVertical: 16,
                  paddingHorizontal: 18,
                  borderRadius: 14,
                  backgroundColor: palette.surfaceRaised,
                  borderWidth: 1,
                  borderColor: palette.lineStrong,
                  fontSize: 16,
                  fontFamily: weights.sansRegular,
                  color: palette.ink,
                  marginBottom: 12,
                }}
              />

              <Pressable
                onPress={requestCode}
                disabled={busy}
                style={{
                  borderRadius: 999,
                  backgroundColor: palette.ink,
                  paddingVertical: 18,
                  alignItems: 'center',
                  opacity: busy ? 0.6 : 1,
                  ...shadows.md,
                }}
              >
                {busy ? (
                  <ActivityIndicator color={palette.bg} />
                ) : (
                  <ThemedText variant="body" weight="semibold" color={palette.bg} style={{ fontSize: 16 }}>
                    인증 코드 받기
                  </ThemedText>
                )}
              </Pressable>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 22, marginBottom: 16 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: palette.line }} />
                <ThemedText variant="tiny" color={palette.ink3} style={{ marginHorizontal: 12, letterSpacing: 1 }} uppercase>
                  또는
                </ThemedText>
                <View style={{ flex: 1, height: 1, backgroundColor: palette.line }} />
              </View>

              <Pressable
                onPress={() => signInWithProvider('kakao')}
                disabled={busy}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 999,
                  backgroundColor: '#FEE500',
                  paddingVertical: 16,
                  marginBottom: 10,
                  opacity: busy ? 0.6 : 1,
                  ...shadows.xs,
                }}
              >
                <ThemedText variant="body" weight="semibold" color="#191600" style={{ fontSize: 15 }}>
                  카카오로 시작하기
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => signInWithProvider('google')}
                disabled={busy}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 999,
                  backgroundColor: palette.surfaceRaised,
                  borderWidth: 1,
                  borderColor: palette.lineStrong,
                  paddingVertical: 16,
                  opacity: busy ? 0.6 : 1,
                  ...shadows.xs,
                }}
              >
                <ThemedText variant="body" weight="semibold" color={palette.ink} style={{ fontSize: 15 }}>
                  Google로 시작하기
                </ThemedText>
              </Pressable>

              <View style={{ alignItems: 'center', marginTop: 18 }}>
                <ThemedText variant="tiny" color={palette.ink3} style={{ lineHeight: 16, textAlign: 'center' }}>
                  이메일은 인증 코드 방식이라 비밀번호가 필요 없어요.{'\n'}소셜 로그인은 한 번 누르면 끝.
                </ThemedText>
              </View>
            </>
          ) : (
            <>
              <ThemedText variant="meta" color={palette.ink2} style={{ marginBottom: 10 }}>
                <ThemedText variant="meta" weight="semibold">
                  {email}
                </ThemedText>
                {' '}로 전송된 인증 코드를 입력해주세요.
              </ThemedText>

              <TextInput
                ref={codeInputRef}
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 10))}
                placeholder="인증 코드"
                placeholderTextColor={palette.ink3}
                keyboardType="number-pad"
                returnKeyType="go"
                onSubmitEditing={verifyCode}
                editable={!busy}
                maxLength={10}
                style={{
                  paddingVertical: 16,
                  paddingHorizontal: 18,
                  borderRadius: 14,
                  backgroundColor: palette.surfaceRaised,
                  borderWidth: 1,
                  borderColor: palette.lineStrong,
                  fontSize: 22,
                  letterSpacing: 4,
                  textAlign: 'center',
                  fontFamily: weights.monoMedium,
                  color: palette.ink,
                  marginBottom: 12,
                }}
              />

              <Pressable
                onPress={verifyCode}
                disabled={busy}
                style={{
                  borderRadius: 999,
                  backgroundColor: palette.ink,
                  paddingVertical: 18,
                  alignItems: 'center',
                  opacity: busy ? 0.6 : 1,
                  ...shadows.md,
                }}
              >
                {busy ? (
                  <ActivityIndicator color={palette.bg} />
                ) : (
                  <ThemedText variant="body" weight="semibold" color={palette.bg} style={{ fontSize: 16 }}>
                    확인하고 시작하기
                  </ThemedText>
                )}
              </Pressable>

              <Pressable onPress={goBack} style={{ alignItems: 'center', marginTop: 14 }}>
                <ThemedText variant="meta" color={palette.ink3}>
                  다른 이메일 사용하기
                </ThemedText>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
