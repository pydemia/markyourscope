# 기술 검증 기록

기준일: 2026-10-01. 대상: [제품 기획안](../docs/product-plan.md)의 기술 검증 단계.
현재 코드는 실제 화면 검증을 위한 프로토타입이며 출시 지원 범위를 확정하지
않는다.

## 구현과 근거

| 항목 | 현재 선택 | 근거와 범위 |
| --- | --- | --- |
| JS/TS 범위 | TypeScript 6.0.3 AST와 공개 구문 진단 | 문자열·주석 속 구문과 실제 노드를 구분하고, 진단을 포함하거나 닫는 구분자가 없는 블록은 제외한다. |
| JSON 범위 | 표준 `JSON.parse`와 TypeScript AST | 엄격한 JSON 파싱이 실패하면 구문 범위 전체를 비운다. |
| Python 범위 | `@lezer/python` 1.1.19 | 들여쓰기 대신 파서 노드로 함수·조건문·반복문을 찾는다. 오류가 포함된 노드는 제외한다. |
| 장식 | VS Code `setDecorations` | 범위 배경, 시작·끝 경계, 보이는 행의 들여쓰기 선을 편집기별로 적용한다. |
| 상태 | 문서 URI·버전 캐시, 편집기별 상위 범위 단계 | 커서 이동 시 파싱 결과를 재사용하고, 분할 편집기 선택 상태를 분리한다. |

VS Code의 [장식 API](https://code.visualstudio.com/api/references/vscode-api)는
`createTextEditorDecorationType`과 `setDecorations`를 제공한다.
[확장 테스트 가이드](https://code.visualstudio.com/api/working-with-extensions/testing-extension)는
Extension Development Host의 통합 테스트를 설명한다. 파서 선택에는
[TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)와
[Lezer 트리 API](https://lezer.codemirror.net/docs/ref/)를 참고했다.

## 실행한 검사

- Windows x64, VS Code 1.139.1, Node.js 24.21.0에서 `npm run check`,
  `npm test`, `npm run build`, 기존 `npm run test:host`가 통과했다.
- 자동 테스트 13개에서 Python 중첩 범위·여러 줄 인자 정렬·미완성 입력,
  TS의 문자열·주석·else 분기·미완성 블록, JS/TS 오류와 복구, JSON 중첩·오류,
  탭 정렬을 확인했다.
- 호스트 테스트는 확장 활성화, 명령 등록·실행, Python 문서 열기를 확인했다.
  적용된 장식의 픽셀 위치나 다른 확장과의 시각적 공존은 판정하지 않는다.
- `npm audit`는 0건이었다.
- 구문 진단 추가 후 합성 10,000행 샘플 한 차례 측정에서 TypeScript 분석
  55.34ms, Python 분석 56.61ms였다. 분석 후 범위 선택 500회 중 p95는
  각각 0.061ms와 0.050ms였다. 확장 호스트의 장식 반영 시간은 포함하지
  않으며 장비·프로세스 상태에 민감한 참고값이다.
- `@vscode/vsce` 4.0.0으로 VSIX를 생성하고, 격리된 확장 디렉터리에
  설치했다. 설치 ID는 `undefined_publisher.mark-your-scope@0.0.1`이다.
  VSIX에서 꺼낸 `extension` 디렉터리를 Development Host에 로드해 기존
  활성화·명령·Python 문서 테스트를 통과했다. 이 검사는 설치된 확장의
  전체 사용자 흐름이나 화면 품질을 판정하지 않는다.

## 확인이 필요한 항목

- 실제 편집기에서 시작·끝 경계가 탭·접힘·줄바꿈에서 어긋나지 않는지
  확인해야 한다. 선택·검색·진단·디버거 표시, 내장 괄호 색상과의 공존도
  화면에서 확인해야 한다.
- 10,000행 커서 이동부터 장식 반영까지 p95 50ms 목표는 측정하지 않았다.
  합성 파서 수치로 이 목표를 달성했다고 판단하지 않는다.
- TypeScript 공개 구문 진단은 JS/TS 오류가 포함된 후보를 제외한다.
  JSON은 표준 파싱 오류 시 모든 구문 범위를 비운다. 빠른 연속 수정과
  실제 편집기의 장식 갱신은 아직 확인하지 않았다.
- Python 파서는 오류 노드를 포함한 상위 범위를 제외한다. 입력 중에는
  확인 가능한 일부 상위 범위도 일시적으로 숨겨질 수 있다.
- 최소 VS Code 버전, 팔레트 색상, 대용량 제한값은 아직 확정하지 않았다.
  현재 manifest의 최소 버전과 20,000행·2MB 제한은 검증용 값이다.
- VSIX 생성기는 라이선스 파일 부재를 경고했다. 설치 ID에 publisher가
  정의되지 않았으므로 공개 배포 전 라이선스·publisher를 확정해야 한다.

## 2026-10-01 재검증: 보이는 영역 장식

- 전체 범위 한 개를 전달하던 배경 장식을 `visibleRanges`와 범위의
  교집합으로 제한했다. 시작·끝 경계도 해당 행이 보일 때만 전달한다.
- `npm run check`, `npm test` 15/15, `npm run test:host`가
  VS Code 1.140.0에서 통과했다. 호스트 검사는 활성화·명령 실행을
  확인하며 픽셀 위치, 접힘·줄바꿈·고대비 공존은 확인하지 않는다.
- 변경 전 합성 10,000행 분석은 TypeScript 58.74ms, Python 59.11ms,
  분석 후 범위 선택 p95는 각각 0.061ms, 0.056ms였다.
  장식 API 호출 지연이나 실제 화면 갱신 수치로 해석하지 않는다.
- 보이는 영역 교집합의 분리 구간과 마지막 행 경계는 단위 테스트로
  확인했다. 실제 편집기의 접힘·줄바꿈에서 `visibleRanges`가 어떻게
  전달되는지는 화면에서 계속 확인해야 한다.
- Extension Host에서 동일 Python 문서를 두 편집기 열에 열고 서로 다른
  커서 위치를 유지한 채 구문 오류 입력과 복구 입력을 적용했다. 명령과
  문서 갱신이 예외 없이 끝났다. 이 검사는 잘못된 장식이 잠시라도
  남았는지 또는 두 열의 장식이 서로 독립적인지를 시각적으로 증명하지
  않으므로 실제 화면 검증은 미완료다.

## 2026-10-01 커서 이동 호스트 측정

- Windows x64, VS Code 1.140.0 Extension Host의 10,001행 TypeScript
  문서에서 최초 분석 이후 커서를 화면 안의 두 행 사이로 20회
  예열하고 200회 이동했다. `npm run benchmark:host` 결과는
  선택 대입부터 선택 이벤트 처리 다음 이벤트 루프까지 p95
  25.25ms, 최대 61.22ms였다.
- 이 구간은 확장의 `setDecorations` 반환까지를 포함하는 보수적인
  상한 측정이며 VS Code 이벤트 전달과 테스트의 다음 루프 대기도
  포함한다. 실제 화면 픽셀 갱신 시각은 측정하지 않았다.
- 한 번의 200회 측정에서 p95 50ms 목표 이내였다. 다른 장비와
  다중 확장 환경에 대한 보증은 아니다.

## 2026-10-01 병적 입력 측정

`npm run stress`로 20,000행·2MB보다 작은 입력을 각각 한 번
분석했다. 수치는 이 Windows x64 프로세스의 참고값이다.

| 입력 | 크기 | 결과 |
| --- | --- | --- |
| TypeScript 100만 글자 단일 행 | 1,000,018바이트 | 13.34ms, 정상 |
| TypeScript 2,000단계 중첩 | 4,003행, 30,027바이트 | 6.61ms 후 `RangeError: Maximum call stack size exceeded` |
| TypeScript 오류 반복 | 3,000행, 63,000바이트 | 64.23ms, 구문 미확정 |
| Python 오류 반복 | 6,000행, 63,000바이트 | 184.08ms, 구문 미확정 |

중첩 예외는 확장 Host의 `analyze` 예외 처리에서 해당 문서의 구문
장식을 지우고 분석 오류 상태로 전환된다. 파서 호출이 동기식이라
오류가 많은 Python 문서에서는 편집 중 지연 위험이 남는다. 출시
제한 또는 분석 예약 방식은 상세 설계에서 결정한다.

## 2026-10-01 VSIX 사전 패키징·설치

- Apache-2.0 전문을 [공식 원문](https://www.apache.org/licenses/LICENSE-2.0.txt)
  에서 가져와 루트 `LICENSE`에 두었다. 번들에 포함된 TypeScript와
  Lezer 패키지의 라이선스·고지도 별도 파일로 포함했다.
- `npm run package:vsix`가 성공했고 VSIX 내부에
  `LICENSE.txt`, `THIRD_PARTY_NOTICES.md`, 각 의존성 고지가
  들어 있음을 패키지 목록에서 확인했다. 현재 번들 JS는 9.69MB,
  VSIX는 1.64MB다.
- 별도 사용자 데이터·확장 디렉터리에 VSIX를 설치했다.
  `--list-extensions --show-versions` 결과는
  `pydemia.mark-your-scope@0.0.1`이다. 같은 프로필의 일반
  VS Code 창에서 Python 범위 표시를 화면으로 확인했다.
- 이 VSIX는 출시 전 `0.0.1` 사전 패키지다. Marketplace 게시,
  GitHub Release 첨부, 최종 버전의 양쪽 채널 설치 결과는 아니다.
- TypeScript 제3자 고지 원문의 후행 공백 때문에 최초 staged
  `git diff --check`가 실패했다. 고지 내용을 유지하도록
  `.gitattributes`에 해당 텍스트만 공백 검사 예외를 명시했고,
  `git diff HEAD^ HEAD --check`를 다시 실행해 통과했다.

## 2026-10-01 예약 분석 구현 검사

- 내용 변경 시 구문 장식을 즉시 지우고 최신 버전의 분석만 75ms
  뒤에 예약한다. 대기 중에는 `Scope: 분석 중`을 표시하고
  들여쓰기 표시를 유지한다. 문서 닫힘과 새 버전은 예약을 취소한다.
- `npm run check`, `npm test` 17/17, `npm run test:host`가
  통과했다. Host 검사는 두 편집기의 오류·복구 입력 후 120ms를
  기다려 예약 실행이 끝나는 경로를 포함한다.
- 변경 후 10,001행 TypeScript 호스트 커서 이동 200회 측정은
  p95 17.84ms, 최대 59ms였다. 측정 구간은 앞의 호스트
  측정과 같고 픽셀 반영 시각은 포함하지 않는다.
- 예약 중 상태 표시줄의 실제 텍스트와 빠른 연속 입력의 모든
  중간 화면은 자동 검사에서 직접 읽지 못한다. MVP 화면 검증 때
  다시 확인한다.

## 2026-10-01 MVP 표시 모드 검사

- `mode` 네 값, 들여쓰기 `background`, `focus.target=lines`,
  `focus.contextLines`를 manifest와 표시 계산에 연결했다.
  사용자가 명시한 들여쓰기 설정은 모드 기본값보다 우선하고
  Off·전체 끄기는 모두 숨긴다. 세션 토글은 구문 장식만 바꾼다.
- `npm run check`, `npm test` 20/20, `npm run test:host`가
  통과했다. 최초 Host 검사에서는 업데이트 전 설정 객체로 값을
  다시 읽어 이전 기본값을 얻었고, 새 설정 객체로 읽도록 검사를
  고친 뒤 통과했다.
- 다섯 가지 화면은 [화면 검증](visual-validation.md)에 캡처했다.
  모드 Quick Pick의 실제 클릭·취소 흐름과 언어별·워크스페이스별
  설정 위치 동작은 아직 별도 확인이 필요하다.
- 같은 10,001행 호스트 커서 이동 200회 재측정은 p95 31.89ms,
  최대 77.18ms였다. 모드용 장식 종류가 늘어난 뒤에도 이 한 번의
  p95는 50ms 목표 안이지만, 최대값과 환경 변동은 남는다.

## 2026-10-01 MVP 기능 재검증

- 팔레트 단위 테스트는 테마별 `auto`, 잘못된 사용자 색상 한 항목의
  개별 대체를 확인했다. Host Quick Pick 검사는 미리보기 취소,
  User 저장, Workspace 저장의 우선순위, Workspace만 초기화,
  User 초기화를 실제 명령으로 실행해 통과했다.
- 이동 명령 Host 검사는 Python 내부에서 상위 `for`를 고른 뒤
  시작·끝 이동, 범위 선택, 보조 커서 보존, 일반 이동 후 기본 범위
  복귀를 확인했다. 끝 이동의 후행 공백과 Unicode 문자 경계도
  단위 테스트로 확인했다.
- `indentation.warnings=all` 화면에서 YAML의 혼합 탭·공백과
  정렬되지 않은 선행 공백에 경고색 테두리가 나타났다. 기본
  `off`, `mixed`, `all` 판단은 단위 테스트 25개에 포함됐다.
- 2026-10-01 최종 기능 코드의 `npm run check`, `npm test` 25/25,
  `npm run test:host`가 통과했다. 10,001행 Host 커서 이동
  200회 재측정은 p95 29.43ms, 최대 67.74ms였다. 이는 이벤트에서
  다음 이벤트 루프 회전까지의 측정이며 픽셀 반영 시각이 아니다.
- [화면 기록](visual-validation.md)은 개발 확장의 관찰이다.
  최종 버전 VSIX 설치와 Marketplace·GitHub 게시 검증은 별도다.

## 작업 지침

[GitHub pydemia/agent-skills](https://github.com/pydemia/agent-skills)의
Software Engineering, pydemia Coding Style, Document Review를
원본 `4874752` 기준으로 확인했다. 초기 검증 당시 참고한
skills.pydemia.ai `/api/health`는 `2d0786579661`을 반환했으나,
GitHub 저장소가 실제 스킬 원본임을 사용자에게 확인받았다.
비색상 상태 전달을 위해 상태 표시줄에 범위 종류와 행을 남겼고,
호스트 활성화·실제 화면·패키지 설치의 결과를 구별해 기록했다.
