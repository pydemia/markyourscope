# 0.1.1 브랜딩·검색 개선 계획

기준: `origin/main` `31f2a59` (2026-10-01). 사용자는
`colors.pydemia.ai`처럼 완성도 있는 로고와 검색에 도움이 되는
태그·상세 설명을 요청했다. 이 문서는 작업 계획과 검증 기록이다.

## 기준과 범위

- Colors의 기울어진 네 타일, 짙은 남색·민트·살구·옅은 회색을
  시각적 출발점으로 삼는다. Mark Your Scope에서는 중첩 범위와
  현재 줄을 나타내는 별도 심벌을 만든다.
- Marketplace 아이콘은 최소 128px, 고해상도 256px PNG로 제공하고,
  재생성 가능한 SVG 원본을 함께 둔다.
- 키워드는 실제 기능·지원 언어에 맞게 작성하고 Marketplace의
  30개 제한보다 충분히 적게 유지한다. `description`은 검색 결과용
  짧은 소개로, README는 사용법·지원 범위·설정 설명으로 쓴다.
- 마켓플레이스 메타데이터 갱신을 위해 패치 버전 `0.1.1`을 출시한다.
  GitHub Release와 Marketplace에 같은 VSIX를 게시한다.

## Phase와 커밋 계획

| Phase | 작업 | 확인 기준 | 커밋 |
| --- | --- | --- | --- |
| 아이콘 | SVG 심벌과 256px PNG, 배너 색상 | 밝은색·어두운색 배경과 32px 축소 화면에서 판독 가능; VSIX에 아이콘 포함 | `[Brand] Add scope logo and Marketplace icon` |
| 검색 문구 | 정확한 키워드, 짧은 설명, README 상세 안내 | 지원 범위와 문구 일치; 키워드 30개 이하; `vsce ls`·VSIX manifest 확인 | `[Doc] Improve extension discovery and description` |
| 출시 | 버전 0.1.1, 검사·패키징·두 채널 게시 | 자동 검사, 공개 VSIX 해시, Marketplace 목록·설치 확인 | `[Release] Publish branding update 0.1.1` |

## 기록 위치

계획·검증·리뷰와 배포 증거는 이 파일에 덧붙인다. 제품 사용자에게
필요한 설명은 README에 둔다.

## 아이콘 검증

- 생성 이미지의 중첩 프레임·현재 줄 구상을 바탕으로 노이즈 없는
  평면 SVG를 제작했다. Colors 로고의 네 색과 기울기를 공유하지만
  타일 배열을 재사용하지 않고 별도의 범위 심벌을 사용한다.
- SVG에서 256×256 투명 PNG를 만들고, 밝은색·어두운색 배경의
  32×32 축소 화면을 확인했다. 문자가 없고 내부 두 단계 프레임과
  살구색 현재 줄이 구분된다.
- `vsce package` 미리보기의 `extension/package.json`은
  `media/icon.png`와 밝은 배너 색상을 가리킨다. VSIX에는 PNG와
  SVG가 모두 포함됐다.

## 검색 문구 검토

- `package.json` 소개는 194자이며 현재 코드 범위, 들여쓰기,
  경계 이동, 표시 모드, 팔레트와 구문 범위 지원 언어를 담았다.
  YAML의 구문 범위를 주장하지 않도록 제외했다.
- 키워드 26개는 대소문자 구분 없이 모두 고유하다. 영어 기능어와
  JS/TS·Python·JSON·YAML, 한국어 `들여쓰기`·`코드 범위`를 포함한다.
  실제로 없는 괄호 색상 변경이나 자동 서식 기능은 태그에 넣지 않았다.
- README는 사용자 관점의 기능, 네 표시 모드, 지원 언어, 빠른 시작
  순서를 설명한다. 일반 파일의 들여쓰기와 제외 언어를 구분했다.
- `vsce package` 미리보기의 manifest에서 새 설명과 키워드 26개를
  확인했다. `git diff --check` 통과.

## 0.1.1 후보 검증

- `npm version 0.1.1 --no-git-tag-version`으로 manifest와 lockfile의
  버전을 함께 올렸다. 실행 코드와 의존성은 바뀌지 않았다.
- `npm run check`, `npm test` 25/25, `npm run test:host` 통과.
- 최종 후보 `mark-your-scope-0.1.1.vsix`는 16개 파일, 약 1.68MB.
  SHA-256:
  `E1E9D9A304C831905D6B7C5A747129C51390CE2AD11F1C35D1A9FD4EE71AFDE9`.
  VSIX manifest의 ID는 `pydemia.mark-your-scope`, 버전은 `0.1.1`,
  아이콘은 `media/icon.png`, 키워드는 26개다.
- 격리된 VS Code 1.140.0 프로필에서 후보 VSIX를 설치했고
  `pydemia.mark-your-scope@0.1.1`이 목록에 나타났다.
- 검증 범위는 기존과 같이 Windows x64, VS Code 1.140.0이다.
  다른 플랫폼·Remote·웹·Notebook·diff 편집기는 새로 검증하지 않았다.

## 게시 결과

PR 병합 후 두 채널에 동일한 VSIX를 게시하고 공개 URL·해시·설치
결과를 이곳에 기록한다.
