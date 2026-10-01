# Mark Your Scope

코드의 들여쓰기와 현재 커서가 속한 구문 범위를 표시하는 VS Code 확장
프로토타입이다. [제품 기획안](docs/product-plan.md)의 첫 단계인 기술 검증용이며,
출시 가능한 MVP로 확정되지 않았다. 승인된 기획 기준과 목표 동작은
[상세 설계안](docs/detailed-design.md), 남은 검증 항목은
[설계 검토](.worknotes/design-review.md)에 정리했다.

## 현재 동작

- JS/TS의 블록, Python의 함수·클래스·조건문·반복문, JSON의 객체·배열을
  구문 범위로 분석한다. 표현식 모드에서는 함수 호출과 배열·객체도 선택한다.
- 커서 위치의 가장 가까운 범위를 옅은 배경과 시작·끝 경계로 표시한다.
  `Focus Parent Scope`와 `Reset Scope Focus` 명령을 사용할 수 있다.
- 화면에 보이는 행의 들여쓰기 시작 지점에 선을 표시한다. 탭 너비는
  편집기의 `tabSize`를 따른다.
- 상태 표시줄에서 선택한 범위의 종류와 행을 보여 준다. 미지원 언어,
  분석 불확실, 분석 오류, 대용량 제한을 구분한다.

현재 기본값은 기술 실험을 위한 것이다. 팔레트 선택, 표시 모드 전체,
범위 이동·선택 명령, 실제 테마·접힘·줄바꿈 공존 검증은 아직 구현 또는
완료되지 않았다. 사용 범위와 확인 결과는
[기술 검증 기록](.worknotes/technical-validation.md)에 정리했다.

## 개발

Node.js와 VS Code가 필요하다.

```powershell
npm ci
npm run check
npm test
npm run build
```

VS Code의 `Run Extension` 디버그 구성을 실행하면 샘플 문서가 있는
Extension Development Host가 열린다. 호스트 자동 검사는 다음 명령으로
실행한다. `VSCODE_EXECUTABLE_PATH`를 지정하지 않으면 테스트 실행기가
VS Code stable을 내려받는다.

```powershell
$env:VSCODE_EXECUTABLE_PATH = "C:\path\to\Code.exe"
npm run test:host
```

`npm run benchmark`는 합성 10,000행 샘플에서 파싱과 커서 범위 선택 시간을
측정한다. 이 수치는 실제 편집기의 장식 지연 시간이 아니다.
