# Mark Your Scope 구현 계획

기준일: 2026-10-01. 기준 커밋: `1c7bbec`.
제품 기준: [기획안](../docs/product-plan.md)과
[상세 설계안](../docs/detailed-design.md).
스킬 기준: `pydemia/agent-skills`의 Software Engineering,
pydemia Coding Style, Document Review (`4874752`).
이 문서는 작업 계획이며 검증 또는 출시 완료 기록이 아니다.

## 결정과 기록 위치

- 출시 언어: JS/TS·Python·JSON 구문 범위, YAML 들여쓰기 표시.
- 기본 표시: Balanced. 팔레트 수치, 최소 VS Code 버전, 분석 제한은
  실제 화면·성능 검증으로 확정한다.
- 라이선스: Apache-2.0. 저장소 루트에 전문 `LICENSE`를 두고
  패키지 메타데이터와 일치시킨다.
- 배포: 같은 버전의 VSIX를 VS Code Marketplace와 GitHub Release에
  게시한다. Marketplace publisher ID와 게시 권한을 먼저 확인한다.
- 구현 계획, Phase 진행, 리뷰, 검증 증적은 `.worknotes/`에 기록한다.
  `docs/`는 제품 기획·설계·사용자 문서에 사용한다. 기존
  `docs/technical-validation.md`와 `docs/design-review.md`의
  작업 기록을 옮기고 링크를 갱신한다.

## Phase별 작업, 의존성, 완료 조건과 커밋

| Phase | 작업과 선행 조건 | 완료 조건 | 계획 커밋 |
| --- | --- | --- | --- |
| 기술 검증 | 현재 프로토타입을 기준으로 빠른 오류·복구, 분할 편집기 상태, 보이는 영역 장식, 탭·접힘·줄바꿈·고대비·선택·검색·진단·디버거 공존을 검증한다. 10,000행 커서 지연과 긴 행·깊은 중첩도 측정한다. | 자동 테스트, Extension Host, 실제 화면, 격리 VSIX 설치의 결과와 미검증 항목을 구분한다. 실패 시 구현 또는 지원 범위를 조정한다. | `[Doc] Move work records to worknotes`; `[Test] Cover editor recovery`; `[Improve] Bound visible scope decorations`; `[Test] Measure editor decoration latency` |
| 상세 설계 | 기술 검증의 오류·화면·성능 결과를 언어 규칙, 상태, 설정, 색상, 제한에 반영한다. Document Review 의견을 반영한다. | 오류·미지원·대용량·분할 편집기 동작과 미확정 값이 구별된 설계를 확정한다. | `[Doc] Finalize scope design from validation` |
| MVP 구현 | 상세 설계 확정 후 모드와 설정, 팔레트 미리보기·취소·저장, 범위 이동·선택, 상태·테마 변경을 구현한다. | 각 사용자 흐름이 자동 테스트와 Host 및 실제 편집기 검증을 통과하고 기획 기준과 일치한다. | `[Feature] Add display modes and settings`; `[Feature] Add palette preview and persistence`; `[Feature] Add scope navigation commands` |
| 출시 검증 | MVP 통과 후 플랫폼·테마·확장 공존, 격리 VSIX 설치, README·지원 범위·배포 정보를 확인한다. Apache-2.0 파일과 publisher 메타데이터를 추가한다. | Marketplace와 GitHub Release 양쪽의 실제 게시 및 설치 결과를 확인하고 남은 제한을 기록한다. | `[Test] Verify packaged extension flows`; `[Doc] Record supported scope and limits`; `[Chore] Add Apache license and release metadata`; `[Release] Publish VSIX to both channels` |

MVP 구현 중 설정 대조에서 `indentation.warnings`가 빠진 것을 확인했다.
기본값 `off`와 `mixed`/`all`의 참고 표시를 구현하고
`[Feature] Add optional indentation warnings` 커밋으로 검증한다.

## 각 작업 단위의 검증과 Git 규칙

1. 관련 구현·호출자·설정·테스트를 읽고 변경 범위를 정한다.
2. 오류와 경계 조건을 재현하는 테스트를 추가한다. 화면 위치와 공존은
   자동 테스트만으로 통과 처리하지 않고 실제 편집기에서 확인한다.
3. `git diff --check`, 타입 검사·관련 테스트·빌드·호스트 검사를
   실행한다. 통과, 수정 후 재확인, 미검증을 분명히 기록한다.
4. 한 목적의 코드·테스트·문서만 묶어 review 후 커밋한다.
   해당 작업 브랜치에 push하고 원격 SHA를 확인한다.
5. 의존 작업은 검증된 커밋에서 진행한다. push만으로 병합·출시를
   완료로 보지 않고 배포 채널의 결과를 각각 확인한다.

현재 세션의 기준 검사: `npm run check` 통과. 일반 `npm test`는
Windows 샌드박스의 `os.userInfo()` 오류로 실행 전에 중단했다.
동일한 테스트 파일 13개를 `tsx/cjs` 직접 실행해 통과했지만 일반 명령과
Extension Host는 별도로 재검증한다. 합성 파서·선택 수치만으로 편집기
장식 지연 목표를 달성했다고 판단하지 않는다.

## 측정과 배포 판단

- 10,000행에서 분석 완료 후 커서 이벤트부터 마지막
  `setDecorations` 호출 반환까지 p95 50ms 이하를 목표로 한다.
  최초 분석과 실제 화면 그리기는 별도로 기록한다.
- 20,000행·2MB는 프로토타입 제한이다. 긴 단일 행, 깊은 중첩, 오류가
  많은 문서의 시간과 장식 개수를 비교한 뒤 출시 기본값을 결정한다.
- VSIX 설치, 실제 화면 품질, Marketplace 게시, GitHub Release 첨부와
  설치를 서로 다른 검증 결과로 기록한다.
- Publisher ID와 게시 자격을 확인한 뒤 동일 버전·동일 VSIX를 두 채널에
  배포한다. 각 채널의 게시 URL과 설치 결과를 기록한다.

## Phase별 모델·노력 권장

| Phase | 계획 | 설계 | 구현 | 검증 |
| --- | --- | --- | --- | --- |
| 기술 검증 | `gpt-6-astra / high` | `gpt-6-astra / high` | `gpt-5.6-sol / medium` | `gpt-5.6-sol / high` |
| 상세 설계 | `gpt-6-astra / high` | `gpt-6-astra / high` | 해당 없음 | `gpt-5.6-sol / high` |
| MVP 구현 | `gpt-6-sol / medium` | `gpt-6-sol / medium` | `gpt-5.6-sol / medium` | `gpt-5.6-sol / high` |
| 출시 검증 | `gpt-6-sol / medium` | 해당 없음 | 수정 시 `gpt-5.6-sol / medium` | `gpt-6-astra / high` |

원인이 불명확한 오래된 결과의 적용·복구 문제는
`gpt-6-astra / high`를 권장한다. 권장값은 실제 적용값이 아니며,
현재 모델·노력 메타데이터는 확인할 수 없다.
