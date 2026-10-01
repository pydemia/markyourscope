# 기술 검증 기록

기준일: 2026-10-01. 대상: [제품 기획안](product-plan.md)의 기술 검증 단계.
현재 코드는 실제 화면 검증을 위한 프로토타입이며 출시 지원 범위를 확정하지
않는다.

## 구현과 근거

| 항목 | 현재 선택 | 근거와 범위 |
| --- | --- | --- |
| JS/TS·JSON 범위 | TypeScript 6.0.3 AST | 문자열·주석 속 구문과 실제 노드를 구분한다. 닫는 구분자가 없는 블록은 제외한다. |
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
  `npm test`, `npm run build`, `npm run test:host`가 통과했다.
- 자동 테스트 10개에서 Python 중첩 범위·여러 줄 인자 정렬·미완성 입력,
  TS의 문자열·주석·else 분기·미완성 블록, JSON 중첩, 탭 정렬을 확인했다.
- 호스트 테스트는 확장 활성화, 명령 등록·실행, Python 문서 열기를 확인했다.
  적용된 장식의 픽셀 위치나 다른 확장과의 시각적 공존은 판정하지 않는다.
- `npm audit`는 0건이었다.
- 합성 10,000행 샘플 한 차례 측정에서 JS/TS 파싱 49.57ms,
  Python 파싱 54.75ms였다. 파싱 후 범위 선택 500회 중 p95는 각각
  0.053ms와 0.066ms였다. 장비·프로세스 상태에 민감한 참고값이다.

## 확인이 필요한 항목

- 실제 편집기에서 시작·끝 경계가 탭·접힘·줄바꿈에서 어긋나지 않는지
  확인해야 한다. 선택·검색·진단·디버거 표시, 내장 괄호 색상과의 공존도
  화면에서 확인해야 한다.
- 10,000행 커서 이동부터 장식 반영까지 p95 50ms 목표는 측정하지 않았다.
  합성 파서 수치로 이 목표를 달성했다고 판단하지 않는다.
- TypeScript 파서는 닫는 구분자를 기준으로 불완전한 범위를 제한한다.
  닫는 구분자가 남아 있는 다른 문법 오류까지 완전히 판별하지 않는다.
- Python 파서는 오류 노드를 포함한 상위 범위를 제외한다. 입력 중에는
  확인 가능한 일부 상위 범위도 일시적으로 숨겨질 수 있다.
- 최소 VS Code 버전, 팔레트 색상, 대용량 제한값은 아직 확정하지 않았다.
  현재 manifest의 최소 버전과 20,000행·2MB 제한은 검증용 값이다.

## 작업 지침

[skills.pydemia.ai의 Software Engineering](https://skills.pydemia.ai/skills/software-engineering),
[pydemia Coding Style](https://skills.pydemia.ai/skills/pydemia-coding-style),
[Product UI/UX Design](https://skills.pydemia.ai/skills/product-ui-ux-design)을
적용했다. 사이트의 `/api/health`에서 확인한 원본 revision은
`2d0786579661`이다. UI 스킬의 비색상 상태 전달 원칙에 따라 상태 표시줄에
범위 종류와 행을 남겼고, 개발 스킬의 검증 구분에 따라 호스트 활성화와
시각적 검증을 별도로 기록했다.
