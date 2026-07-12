import Foundation

enum GamePhase: String, Sendable {
    case setup
    case capitalSelection
    case diplomacy
    case reinforcement
    case attackPlanning
    case attack
    case battleResolution
    case fortify
    case gameOver
}

enum GameMode: String, CaseIterable, Sendable {
    case classic
    case sameTime

    var displayName: String {
        switch self {
        case .classic: "Classic"
        case .sameTime: "Same-Time"
        }
    }
}


enum SessionType: String, CaseIterable, Sendable {
    case singlePlayer
    case hotSeat
    case networkLAN
    case tournament

    var displayName: String {
        switch self {
        case .singlePlayer: "Single Player"
        case .hotSeat: "Hot-Seat"
        case .networkLAN: "LAN"
        case .tournament: "Tournament"
        }
    }

    var description: String {
        switch self {
        case .singlePlayer: "One human commander against AI generals."
        case .hotSeat: "Multiple human players sharing one device with AI support."
        case .networkLAN: "Local network session with human opponents."
        case .tournament: "16-game campaign with progressive rule variations."
        }
    }
}

enum GameObjective: String, CaseIterable, Sendable {
    case domination60
    case domination80
    case domination100
    case mission
    case capital

    var displayName: String {
        switch self {
        case .domination60: "Domination (60%)"
        case .domination80: "Domination (80%)"
        case .domination100: "World Domination"
        case .mission: "Mission"
        case .capital: "Capital"
        }
    }

    var description: String {
        switch self {
        case .domination60: "Occupy 60% of all territories"
        case .domination80: "Occupy 80% of all territories"
        case .domination100: "Conquer every territory on the map"
        case .mission: "Complete your secret mission objective"
        case .capital: "Hold your capital & conquer enemy capitals"
        }
    }
}

enum TerritoryAllocation: String, CaseIterable, Sendable {
    case random
    case territoryGrab
    case election

    var displayName: String {
        switch self {
        case .random: "Random Deal"
        case .territoryGrab: "Territory Grab"
        case .election: "Election"
        }
    }

    var description: String {
        switch self {
        case .random:
            return "Fastest setup. Territories are dealt automatically."
        case .territoryGrab:
            return "Players draft territories one by one in turn order."
        case .election:
            return "Simulated bids with influence from neighboring territories."
        }
    }
}

enum CardTradeRule: String, CaseIterable, Sendable {
    case ascending
    case ascendingOneAtATime
    case cardNature

    var displayName: String {
        switch self {
        case .ascending: "Ascending"
        case .ascendingOneAtATime: "Ascending (1 at a time)"
        case .cardNature: "Card Nature"
        }
    }
}