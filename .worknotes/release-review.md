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

## 2026-10-01 GitHub 초안 확인

PR [#1](https://github.com/pydemia/markyourscope/pull/1)을
`65f56d95386b3863021b95f30d33191960c6ca08`로 병합했다.
`v0.1.0` GitHub Release **초안**에 최종 후보 VSIX를 첨부했다.
초안의 대상은 병합 커밋이며, 첨부 파일을 GitHub에서 다시
내려받아 계산한 SHA-256은 위의 로컬 값과 일치했다.
초안 URL은 공개 출시 URL이 아니므로 공개 게시가 끝난 후
URL과 설치 결과를 다시 기록한다.

## 2026-10-01 GitHub 공개 게시 확인

GitHub Release
[v0.1.0](https://github.com/pydemia/markyourscope/releases/tag/v0.1.0)을
공개했다. 태그는 병합 커밋 `65f56d9`를 가리킨다. 로그인 없는
공개 URL에서
[`mark-your-scope-0.1.0.vsix`](https://github.com/pydemia/markyourscope/releases/download/v0.1.0/mark-your-scope-0.1.0.vsix)를
다운로드해 SHA-256이
`82AAA5114D489206596FDC6D48D4B9C1915904C0E06FF0AA5706AB448041235A`
임을 확인했다. 다운로드한 파일을 또 다른 격리 디렉터리에 설치했고
`pydemia.mark-your-scope@0.1.0`이 목록에 나타났다.
Marketplace는 아직 게시되지 않아 전체 배포 완료로 판정하지 않는다.

## 2026-10-01 Marketplace 게시 확인

이전 `vsce` 형식의 Windows 자격 증명을 현재 `vsce` 4.0.0 저장소로
이전한 뒤 `verify-pat pydemia`로 게시 권한을 확인했다. GitHub Release와
동일한 로컬 VSIX를 `vsce publish --packagePath`로 게시했고 CLI가
`pydemia.mark-your-scope v0.1.0` 게시 완료를 반환했다. 공개 Gallery
조회 `vsce show pydemia.mark-your-scope`는 버전 `0.1.0`과
`Microsoft.VisualStudio.Services.VsixSha256` 값
`82AAA5114D489206596FDC6D48D4B9C1915904C0E06FF0AA5706AB448041235A`
를 표시한다. 이는 GitHub Release에서 받은 VSIX와 일치한다.
공개 Gallery가 제공한 CDN URL에서도 로그인 없이 VSIX를 내려받아
크기 1,751,171바이트와 동일한 SHA-256을 확인했다.

Marketplace URL:
[Mark Your Scope](https://marketplace.visualstudio.com/items?itemName=pydemia.mark-your-scope).
게시 직후 Gallery 응답의 `Public` 플래그는 있으나 `Validated` 플래그는
아직 없고, `vsce search`와 VS Code 1.140.0의 Marketplace 설치는
아직 확장을 찾지 못했다. 후속 확인에서 Gallery 확장 플래그는
`Public | Validated` (`260`), 버전 플래그는 `Validated` (`1`)로
변경됐다. Marketplace 공개 페이지는 HTTP 200과
`Mark Your Scope - Visual Studio Marketplace` 제목을 반환했다.
`vsce search`도 확장 ID를 표시했고, 격리된 VS Code 1.140.0
프로필에서 Marketplace 확장 ID로 설치한 뒤
`pydemia.mark-your-scope@0.1.0`을 목록에서 확인했다.

이로써 GitHub Release와 VS Code Marketplace의 공개 게시,
동일한 VSIX 바이트, Marketplace 검색과 설치를 모두 확인했다.

## 2026-10-30 Marketplace 0.2.0 게시 확인

- 중첩 절·괄호·호출·반환·대입 범위와 VS Code 1.139.1 호환성을 `main` 커밋 `2a792eefa36ff901ec7111eb43a0515253922a66`에 반영하고 원격 SHA를 대조했다.
- `npm run check`, `npm test` 32/32, VS Code 1.139.1 및 1.140.0 Extension Host를 통과했다.
- 후보 `mark-your-scope-0.2.0.vsix`의 ID는 `pydemia.mark-your-scope`, 버전은 `0.2.0`, 엔진은 `^1.139.1`이다. SHA-256은 `1000AA68DDD0939CD7051C52FBA83C2410272282C90F4D415F63A20FE8F12959`다.
- 격리된 VS Code 1.139.1 프로필에서 후보 VSIX를 설치해 `pydemia.mark-your-scope@0.2.0`을 확인했다.
- `vsce verify-pat pydemia` 통과 후 동일한 VSIX를 `vsce publish --packagePath`로 게시했다. 게시자 Gallery에서 버전 `0.2.0`과 같은 SHA-256을 확인했고, 검증 완료 플래그가 설정됐다.
- 공개 Gallery의 최신 버전은 `0.2.0`이며 엔진 `^1.139.1`과 같은 SHA-256을 표시한다. [Marketplace 페이지](https://marketplace.visualstudio.com/items?itemName=pydemia.mark-your-scope)는 HTTP 200과 `0.2.0`을 반환한다. 공개 CDN의 VSIX를 다시 내려받아 같은 SHA-256을 확인했다.
- `vsce search "Mark Your Scope"`에 ID가 나타나고, 새 격리 VS Code 1.139.1 프로필에서 Marketplace ID로 설치한 결과 `pydemia.mark-your-scope@0.2.0`을 확인했다.

## 2026-10-30 Marketplace 0.3.0 게시 확인

- 상위 범위 색, 현재 범위 강조, 바깥 감광, 범위별 레일을 `main` 커밋 `f863f53f0ab10deb4fd4eaafca758e2695cf737e`에 반영하고 원격 SHA를 대조했다.
- `npm run check`, `npm test` 33/33, VS Code 1.140.0 Extension Host를 통과했다. 10,001행·200회 선택 호스트 벤치마크 p95는 16.31ms다.
- VS Code 1.139.1 설치본의 호스트 재실행은 업데이트 잠금으로 시작되지 않았다. 대신 격리 프로필에 후보 VSIX와 공개 Marketplace ID를 각각 설치해 두 경우 모두 `pydemia.mark-your-scope@0.3.0`을 확인했다.
- 게시한 `mark-your-scope-0.3.0.vsix`의 SHA-256은 `56611D10A4ADC490F0EBE1D3E249A3ECA7E9D4C6819BFD0F417CBEA6215E865D`다. `vsce verify-pat pydemia`와 `vsce publish --packagePath`가 성공했다.
- 공개 Gallery의 0.3.0 엔진은 `^1.139.1`, VSIX SHA-256은 게시 파일과 같다. 공개 CDN에서 받은 1,765,544바이트 VSIX도 같은 해시다. Marketplace 페이지는 HTTP 200과 0.3.0을 반환했다.
- 실제 편집기 화면의 선택·검색·진단 표시와 겹치는 모습은 이번 게시에서 별도 스크린샷 검증을 하지 못했다. 레일은 들여쓰기 공백이 있는 행에만 그린다.
