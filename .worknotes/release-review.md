# Mark Your Scope 0.1.0 출시 검토

검토일: 2026-10-01. 대상: `feature/markyourscope-mvp`의
`a8f5d58` 이후 기능, 사용자 문서와 출시 메타데이터.
기준: [구현 계획](implementation-plan.md),
[상세 설계](../docs/detailed-design.md),
GitHub `pydemia/agent-skills`의 Document Review (`4874752`).

## 코드 검토

| 검토 항목 | 판단과 근거 |
| --- | --- |
| 오류·대용량 | 문서 버전별 분석 캐시, 75ms 예약, 이전 구문 장식 제거, 예외 상태, 20,000행·2 MiB 제한을 확인했다. 오류·복구와 긴 행·깊은 중첩의 결과는 [기술 검증](technical-validation.md)에 분리했다. |
| 분할 편집기·이동 | 편집기별 장식·범위 선택 상태를 분리했다. Host는 상위 범위 유지, 끝 이동, 보조 커서 보존, 일반 이동 초기화를 통과했다. |
| 설정·팔레트 | `enabled`와 Off의 전체 숨김, 토글의 구문 장식만 숨김, 팔레트 미리보기 취소·User/Workspace 우선순위·위치별 초기화, 테마 전환을 확인했다. 잘못된 사용자 색상은 해당 키만 기본값으로 바꾼다. |
| 들여쓰기 경고 | 기본값은 `off`, `mixed`는 혼합 선행 공백, `all`은 탭 폭 정렬도 참고 장식으로 알린다. 구문 진단이나 자동 수정을 만들지 않는다. |
| 배포 메타데이터 | `0.1.0`, `pydemia`, VS Code `^1.140.0`, `Visualization`, 라이선스 링크와 Apache-2.0 전문, 번들 의존성 고지를 확인했다. 제품 이미지와 README가 VSIX에 포함되고 내부 작업 기록·설계 초안은 제외된다. |

검토 중 발견한 기획 누락 `indentation.warnings`, 오래된 README 문구,
VSIX에 필요 없는 설계 문서 포함을 각각 구현·문서·패키지 구성에서
수정했다. 현재 확인된 코드상 높은 우선순위 결함은 없다.

## 검증 게이트

- `npm ci` 통과. 157개 패키지 감사에서 취약점 0개로 보고됐다.
- `npm run check`, `npm test` 25/25, `npm run test:host` 통과.
  TypeScript·Python·JSON 오류와 분할 편집기, 팔레트 명령, 이동·선택
  명령을 포함한다.
- 10,001행, 커서 이동 200회 Host 측정 p95 29.43ms, 최대
  67.74ms. 목표 p95 50ms 이하다. 픽셀 반영 시간은 아니다.
- 실제 Extension Development Host의 밝은색·어두운색·고대비,
  탭·접힘·줄바꿈·선택·검색·진단·디버거·추가 확장 화면은
  [화면 검증](visual-validation.md)에 따로 기록했다.
- 최종 후보 `mark-your-scope-0.1.0.vsix`는 14개 파일,
  약 1.67MB다. SHA-256:
  `82AAA5114D489206596FDC6D48D4B9C1915904C0E06FF0AA5706AB448041235A`.
  VSIX manifest는 `pydemia.mark-your-scope` 버전 `0.1.0`,
  라이선스 `extension/LICENSE.txt`를 표시했다.
- 격리 프로필 설치 목록은 `pydemia.mark-your-scope@0.1.0`이며,
  개발 확장 옵션 없는 일반 VS Code 창에서 Python 범위 장식을
  화면으로 확인했다. 첫 프로필의 Copilot 로그인 안내가 화면을
  가려, 두 번째 검증 프로필에서 해당 내장 확장을 비활성화하고
  설치된 VSIX 화면을 확인했다.

## 남은 제약과 게시 게이트

- Windows x64, VS Code 1.140.0에서만 Host와 화면을 확인했다.
  macOS·Linux, Remote, 웹, Notebook·diff 편집기는 별도 검증 전이다.
- 오류가 많은 Python 6,000행 분석 한 번은 기술 검증에서
  184.08ms였다. 깊은 중첩은 파서 예외를 `분석 오류`로 표시한다.
- Marketplace 게시 인증은 아직 없다. `vsce ls-publishers`는
  로컬 publisher 목록이 비어 있고 `verify-pat pydemia`는 권한
  오류를 반환했다. 사용자에게 `vsce login`을 요청했다.
- GitHub Release와 Marketplace의 실제 게시, 공개 다운로드,
  게시본 설치는 이 검토 시점에 아직 수행하지 않았다.

코드·패키지 후보는 공개 배포를 위한 준비가 됐다. 게시 완료 판정은
두 채널의 실제 URL, 같은 VSIX 해시와 설치 결과를 확인한 뒤
내린다.
