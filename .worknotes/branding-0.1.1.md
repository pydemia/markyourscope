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
