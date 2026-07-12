import Foundation

enum AllianceLevel: Int, CaseIterable, Sendable {
    case threat = 0
    case level1 = 1
    case level2 = 2
    case level3 = 3

    var displayName: String {
        switch self {
        case .threat: "Threat"
        case .level1: "Alliance I"
        case .level2: "Alliance II"
        case .level3: "Alliance III"
        }
    }

    var description: String {
        switch self {
        case .threat: "A warning or provocation"
        case .level1: "Don't attack continents or largest empire"
        case .level2: "Don't attack each other (one card exception)"
        case .level3: "No attacks whatsoever"
        }
    }

    var symbolName: String {
        switch self {
        case .threat: "exclamationmark.triangle.fill"
        case .level1: "handshake"
        case .level2: "shield.fill"
        case .level3: "lock.shield.fill"
        }
    }
}

struct AllianceProposal: Identifiable, Sendable {
    let id: UUID
    let fromPlayerID: String
    let toPlayerID: String
    let level: AllianceLevel
    var accepted: Bool?

    init(fromPlayerID: String, toPlayerID: String, level: AllianceLevel) {
        self.id = UUID()
        self.fromPlayerID = fromPlayerID
        self.toPlayerID = toPlayerID
        self.level = level
    }
}

struct ActiveAlliance: Identifiable, Sendable {
    let id: UUID
    let player1ID: String
    let player2ID: String
    let level: AllianceLevel

    init(player1ID: String, player2ID: String, level: AllianceLevel) {
        self.id = UUID()
        self.player1ID = player1ID
        self.player2ID = player2ID
        self.level = level
    }
}