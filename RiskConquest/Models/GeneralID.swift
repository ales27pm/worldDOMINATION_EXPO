import Foundation

enum GeneralID: String, CaseIterable, Codable, Sendable, Identifiable {
    var id: String { rawValue }

    case campbell, mackenzie, wellington, bonaparte, marmont
    case barbacena, dErlon = "dErlon", maransin, solignac, sherbrooke
    case aubert, spencer, taupin, freire, vauban, baird


    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let rawValue = try container.decode(String.self)

        switch rawValue {
        case Self.dErlon.rawValue, "derlon":
            self = .dErlon
        default:
            guard let value = Self(rawValue: rawValue) else {
                throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid GeneralID raw value: \(rawValue)")
            }
            self = value
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(rawValue)
    }

    var displayName: String {
        switch self {
        case .campbell: "Campbell"
        case .mackenzie: "Mackenzie"
        case .wellington: "Wellington"
        case .bonaparte: "Bonaparte"
        case .marmont: "Marmont"
        case .barbacena: "Barbacena"
        case .dErlon: "D'Erlon"
        case .maransin: "Maransin"
        case .solignac: "Solignac"
        case .sherbrooke: "Sherbrooke"
        case .aubert: "Aubert"
        case .spencer: "Spencer"
        case .taupin: "Taupin"
        case .freire: "Freire"
        case .vauban: "Vauban"
        case .baird: "Baird"
        }
    }

    var aggression: Double {
        switch self {
        case .campbell: 0.5
        case .mackenzie: 0.6
        case .wellington: 0.7
        case .bonaparte: 0.9
        case .marmont: 0.95
        case .barbacena: 0.8
        case .dErlon: 0.25
        case .maransin: 0.75
        case .solignac: 0.4
        case .sherbrooke: 0.45
        case .aubert: 0.7
        case .spencer: 0.55
        case .taupin: 0.85
        case .freire: 0.35
        case .vauban: 0.8
        case .baird: 0.85
        }
    }

    var riskTolerance: Double {
        switch self {
        case .campbell: 0.4
        case .mackenzie: 0.5
        case .wellington: 0.6
        case .bonaparte: 0.8
        case .marmont: 0.95
        case .barbacena: 0.7
        case .dErlon: 0.2
        case .maransin: 0.65
        case .solignac: 0.35
        case .sherbrooke: 0.4
        case .aubert: 0.6
        case .spencer: 0.45
        case .taupin: 0.75
        case .freire: 0.3
        case .vauban: 0.7
        case .baird: 0.8
        }
    }

    var unpredictability: Double {
        switch self {
        case .campbell: 0.1
        case .mackenzie: 0.25
        case .wellington: 0.3
        case .bonaparte: 0.7
        case .marmont: 0.6
        case .barbacena: 0.2
        case .dErlon: 0.1
        case .maransin: 0.65
        case .solignac: 0.4
        case .sherbrooke: 0.15
        case .aubert: 0.9
        case .spencer: 0.3
        case .taupin: 0.55
        case .freire: 0.5
        case .vauban: 0.35
        case .baird: 0.8
        }
    }

    var honorLevel: Double {
        switch self {
        case .campbell: 0.6
        case .mackenzie: 0.8
        case .wellington: 0.7
        case .bonaparte: 0.3
        case .marmont: 0.2
        case .barbacena: 0.4
        case .dErlon: 0.85
        case .maransin: 0.25
        case .solignac: 0.35
        case .sherbrooke: 0.95
        case .aubert: 0.15
        case .spencer: 0.65
        case .taupin: 0.3
        case .freire: 0.15
        case .vauban: 0.1
        case .baird: 0.1
        }
    }

    var vengefulness: Double {
        switch self {
        case .campbell: 0.2
        case .mackenzie: 0.8
        case .wellington: 0.4
        case .bonaparte: 0.85
        case .marmont: 0.3
        case .barbacena: 0.75
        case .dErlon: 0.3
        case .maransin: 0.2
        case .solignac: 0.2
        case .sherbrooke: 0.6
        case .aubert: 0.35
        case .spencer: 0.4
        case .taupin: 0.5
        case .freire: 0.25
        case .vauban: 0.9
        case .baird: 0.9
        }
    }

    var briefDescription: String {
        switch self {
        case .campbell: "Cautious but focused on missions. Stable and forgiving."
        case .mackenzie: "Never forgets a betrayal. Honors alliances. Mission-driven."
        case .wellington: "Master strategist. Deliberate but unpredictable. Top tier."
        case .bonaparte: "Aggressive and vengeful. Strikes fast. Erratic but deadly."
        case .marmont: "Biggest risk taker. Devastating attacks. Little regard for losses."
        case .barbacena: "Aggressive with good memory. Focused on world domination."
        case .dErlon: "Most cautious general. Defends over attacks. Highly honorable."
        case .maransin: "Strikes first, retreats fast. Erratic and dangerous neighbor."
        case .solignac: "Inexperienced but enthusiastic. Bad memory. Don't underestimate."
        case .sherbrooke: "Most honorable. Loves alliances. Slow and methodical."
        case .aubert: "Most erratic general. Cares nothing for alliances. Dangerous."
        case .spencer: "Plays by the book. Generally honorable until desperate."
        case .taupin: "Calculating warmonger. Unstable edge. Obsessed with missions."
        case .freire: "Inexperienced and untrustworthy. Ignores border threats."
        case .vauban: "Lives by the sword. Vengeful. Fast, decisive, formidable."
        case .baird: "Little honor, much aggression. Dangerous and unstable."
        }
    }

    var difficulty: Int {
        switch self {
        case .solignac, .freire: 1
        case .baird, .aubert, .dErlon, .maransin: 2
        case .campbell, .mackenzie, .sherbrooke, .spencer, .barbacena: 3
        case .marmont, .taupin, .vauban: 4
        case .wellington, .bonaparte: 5
        }
    }

    var symbolName: String {
        switch self {
        case .campbell: "shield.checkered"
        case .mackenzie: "flag.fill"
        case .wellington: "crown.fill"
        case .bonaparte: "bolt.fill"
        case .marmont: "flame.fill"
        case .barbacena: "scope"
        case .dErlon: "shield.fill"
        case .maransin: "tornado"
        case .solignac: "leaf.fill"
        case .sherbrooke: "star.fill"
        case .aubert: "hurricane"
        case .spencer: "book.fill"
        case .taupin: "target"
        case .freire: "wind"
        case .vauban: "burst.fill"
        case .baird: "exclamationmark.triangle.fill"
        }
    }
}