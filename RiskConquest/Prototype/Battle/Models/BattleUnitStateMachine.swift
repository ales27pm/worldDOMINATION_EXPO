import Foundation

@MainActor
final class BattleUnitStateMachine: ObservableObject {
    enum State: String, CaseIterable {
        case idle
        case prepare
        case attack
        case impact
        case recover
        case die

        var sequenceName: String { rawValue }
    }

    @Published private(set) var state: State = .idle

    func transition(to newState: State) {
        state = newState
    }
}