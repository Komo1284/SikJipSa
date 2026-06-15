const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Podfile에 `use_modular_headers!`를 주입한다.
 *
 * Google 로그인 SDK가 끌어오는 Swift pod(AppCheckCore)가 GoogleUtilities·
 * RecaptchaInterop에 의존하는데, 이들이 모듈을 정의하지 않아 정적 라이브러리로
 * 통합되지 않는다("cannot yet be integrated as static libraries"). CNG 워크플로는
 * 매 빌드 transitive pod를 최신으로 가져오므로 SDK 변경 없이도 깨질 수 있다.
 * 전역 모듈러 헤더를 켜면 모듈맵이 생성되어 해결된다. (로컬 pod install로 검증됨)
 */
module.exports = function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfile, 'utf8');
      if (!contents.includes('use_modular_headers!')) {
        contents = contents.replace(
          /(\n\s*use_expo_modules!)/,
          '$1\n  use_modular_headers!',
        );
        fs.writeFileSync(podfile, contents);
      }
      return cfg;
    },
  ]);
};
