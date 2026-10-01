# 실제 편집기 화면 검증

검증일: 2026-10-01. Windows x64, VS Code 1.140.0 Extension Development
Host, 1458×914 창(기본 화면은 1218×810). 배포된 VSIX 화면이 아니라
현재 개발 확장을 로드한 화면이다.

| 장면 | 관찰 | 증거 |
| --- | --- | --- |
| 기본 Python 중첩 | 함수 범위 배경과 경계가 보인다. | [기본](visual/default.png) |
| 분할 편집기 | 같은 Python 문서를 두 열에 열고 왼쪽은 `for`, 오른쪽은 `if` 안에 커서를 뒀다. 두 열의 범위 경계가 서로 달랐다. | [분할](visual/split.png) |
| 접힘 | 오른쪽 TypeScript 함수가 접혔을 때 범위 경계가 접힌 화면에 나타났다. 긴 범위의 숨겨진 내부 행이 별도 배경으로 칠해진 흔적은 보이지 않았다. | [접힘](visual/fold.png) |
| 고대비·자동 줄바꿈 | 기본 고대비 테마에서 TypeScript 긴 행이 여러 화면 행으로 감겼다. 텍스트와 경계가 보였고 편집기 기본 진단 밑줄도 보였다. | [고대비](visual/high-contrast.png) |
| 혼합 탭·선택·검색·진단·추가 장식 | 탭 두 단계가 있는 TypeScript 샘플에서 들여쓰기 선, 선택한 단어, 검색 결과, 오류 밑줄과 별도 점선 장식을 함께 표시했다. 검색 위젯과 범위 경계가 보였다. | [겹침](visual/overlap.png) |
| 디버거 현재 행 | Node 디버거가 `debugger` 행에 멈췄을 때 노란 현재 행 표시와 범위 경계·배경이 함께 보였고 코드 텍스트를 읽을 수 있었다. | [디버거](visual/debug.png) |
| 구문 오류와 복구 | `save(`로 미완성 입력을 만든 뒤에는 넓은 범위 배경이 보이지 않았다. `save();`로 복구한 뒤에는 `if` 범위 경계와 배경이 다시 나타났다. 각 캡처는 입력 후 안정된 화면이다. | [오류](visual/broken.png), [복구](visual/repaired.png) |
| 별도 확장 장식 | 두 번째 개발 확장이 `save`에 초록색 외곽선을 적용했다. Mark Your Scope의 범위 배경·경계와 외곽선이 같은 화면에 남았고 텍스트를 읽을 수 있었다. Marketplace에서 설치한 제삼자 확장의 모든 조합을 대표하지는 않는다. | [두 확장](visual/companion.png) |
| 격리 VSIX 설치 | `pydemia.mark-your-scope@0.0.1` 설치 후 개발 로드 옵션 없이 일반 VS Code 창에서 Python 범위 표시가 보였다. | [설치 화면](visual/installed-vsix.png) |
| 표시 모드 | 같은 TypeScript 중첩 샘플에서 Balanced는 옅은 배경·경계, Structure는 경계 중심과 들여쓰기 공백 배경, Focus는 더 진한 범위 배경, Off는 확장 범위 표시 없음으로 보였다. 주변 행 목표는 논리 행 1–7을 표시했다. | [Balanced](visual/mode-balanced.png), [Structure](visual/mode-structure.png), [Focus](visual/mode-focus.png), [Off](visual/mode-off.png), [주변 행](visual/mode-lines.png) |
| 팔레트 미리보기 | Dark Soft 설정에서 Quick Pick을 열어 Light Soft로 이동했을 때 선택 항목과 편집기 장식이 표시됐다. 취소 후 기존 설정 유지와 User 위치 저장 후 새 설정 적용은 Host 명령 검사로 확인했다. | [미리보기](visual/palette-preview.png) |
| 범위 선택 명령 | Python의 `if` 내부에서 상위 범위를 선택하자 `for` 블록의 시작부터 끝까지 선택 영역과 범위 경계가 나타났다. 시작·끝 이동, 보조 커서 보존, 일반 이동 후 초기화는 Host 명령 검사로 확인했다. | [선택](visual/navigation-selected.png) |
| 선택적 들여쓰기 경고 | YAML의 혼합 탭·공백과 탭 폭에 맞지 않는 들여쓰기에 경고색 테두리가 나타났다. 이 장식은 구문 진단이 아니며 기본값에서는 꺼져 있다. | [경고](visual/indentation-warnings.png) |

이 관찰은 각 캡처의 해당 상태만 확인한다. 접힘·줄바꿈 중 모든 커서
위치, 혼합 탭의 모든 조합, 제삼자 확장 전체와의 공존,
빠른 오류·복구 중 잠깐 남는 장식은 아직 화면으로 판정하지 않았다.
겹침 화면의 점선은 검증 호스트가 만든 두 번째 장식이며 별도 확장
설치의 증거는 아니다. 명령과 문서 갱신이 예외 없이
끝나는 Host 검사와도 별도 결과다. 출시 전 각 항목을 다시 확인한다.
