import { ThemedText } from '@/components/Typography';
import { humanizeError, isUserCancelled } from '@/lib/errors';
import { LEGAL_URLS } from '@/lib/legal';
import { useAuthStore } from '@/store/auth';
import { useTheme } from '@/theme/ThemeProvider';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Pressable,
  View,
} from 'react-native';
import Svg, { Defs, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

export default function Onboarding() {
  const { palette, shadows, weights } = useTheme();
  const router = useRouter();
  const { width, height } = Dimensions.get('window');
  const signIn = useAuthStore((s) => s.signIn);
  const session = useAuthStore((s) => s.session);

  const [busy, setBusy] = useState<null | 'kakao' | 'google'>(null);

  useEffect(() => {
    if (session) router.replace('/(tabs)/home');
  }, [session, router]);

  const signInWithProvider = async (provider: 'kakao' | 'google') => {
    try {
      setBusy(provider);
      await signIn(provider);
    } catch (e) {
      console.warn('[onboarding] sign-in failed:', e);
      if (!isUserCancelled(e)) {
        Alert.alert(
          '로그인 실패',
          humanizeError(e, '로그인을 완료하지 못했어요. 잠시 후 다시 시도해주세요.'),
        );
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMin slice">
          <Defs>
            <RadialGradient id="halo" cx="50%" cy="28%" rx="80%" ry="80%" fx="50%" fy="28%">
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

      <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: 28, paddingBottom: 56 }}>
        <ThemedText
          variant="tiny"
          family="mono"
          color={palette.ink3}
          uppercase
          style={{ marginBottom: 14, letterSpacing: 1.4 }}
        >
          SikJipSa · v{Constants.expoConfig?.version ?? '1.0.0'}
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

        <ThemedText variant="body" color={palette.ink2} style={{ marginTop: 22, marginBottom: 36, maxWidth: 320 }}>
          물주기·비료·분갈이까지 — 내 공간의{'\n'}식물 한 그루 한 그루를 잊지 않도록.
        </ThemedText>

        <Pressable
          onPress={() => signInWithProvider('kakao')}
          disabled={busy !== null}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 14,
            backgroundColor: '#FEE500',
            paddingVertical: 16,
            paddingHorizontal: 18,
            marginBottom: 12,
            opacity: busy && busy !== 'kakao' ? 0.45 : 1,
            ...shadows.xs,
          }}
        >
          {busy === 'kakao' ? (
            <ActivityIndicator color="#191600" />
          ) : (
            <>
              <KakaoLogo />
              <ThemedText weight="semibold" color="#191600" style={{ fontSize: 16, marginLeft: 10 }}>
                카카오로 시작하기
              </ThemedText>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={() => signInWithProvider('google')}
          disabled={busy !== null}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 14,
            backgroundColor: palette.surfaceRaised,
            borderWidth: 1,
            borderColor: palette.lineStrong,
            paddingVertical: 16,
            paddingHorizontal: 18,
            opacity: busy && busy !== 'google' ? 0.45 : 1,
            ...shadows.xs,
          }}
        >
          {busy === 'google' ? (
            <ActivityIndicator color={palette.ink} />
          ) : (
            <>
              <GoogleLogo />
              <ThemedText weight="semibold" color={palette.ink} style={{ fontSize: 16, marginLeft: 10 }}>
                Google로 시작하기
              </ThemedText>
            </>
          )}
        </Pressable>

        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <ThemedText variant="tiny" color={palette.ink3} style={{ lineHeight: 18, textAlign: 'center' }}>
            로그인하면{' '}
            <ThemedText
              variant="tiny"
              color={palette.ink2}
              weight="medium"
              style={{ textDecorationLine: 'underline' }}
              onPress={() => Linking.openURL(LEGAL_URLS.terms)}
            >
              서비스 이용약관
            </ThemedText>
            {' '}및{' '}
            <ThemedText
              variant="tiny"
              color={palette.ink2}
              weight="medium"
              style={{ textDecorationLine: 'underline' }}
              onPress={() => Linking.openURL(LEGAL_URLS.privacy)}
            >
              개인정보 처리방침
            </ThemedText>
            에{'\n'}동의하는 것으로 간주돼요.
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

/**
 * Kakao "talk bubble" mark — 24×24, designed to sit on the Kakao yellow
 * (#FEE500). The dark glyph color (#191600) matches the official guideline.
 */
function KakaoLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M12 4C6.477 4 2 7.582 2 12c0 2.825 1.83 5.31 4.6 6.74L5.4 22.5c-.07.22.18.4.37.27l4.5-3.07c.56.07 1.13.1 1.73.1 5.523 0 10-3.582 10-8s-4.477-7.8-10-7.8z"
        fill="#191600"
      />
    </Svg>
  );
}

/**
 * Google four-color "G" — official identity colors.
 * Drawn at 24×24 viewBox for crisp rendering at 20px display size.
 */
function GoogleLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <G>
        <Path
          fill="#FFC107"
          d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
        />
        <Path
          fill="#FF3D00"
          d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
        />
        <Path
          fill="#4CAF50"
          d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
        />
        <Path
          fill="#1976D2"
          d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
        />
      </G>
    </Svg>
  );
}
