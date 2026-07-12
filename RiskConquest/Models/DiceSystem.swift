import SwiftUI

enum DiceColor: String, Sendable {
    case white, yellow, green, red, black

    var colorValue: Int {
        switch self {
        case .white: 1
        case .yellow: 2
        case .green: 3
        case .red: 4
        case .black: 5
        }
    }

    var displayColor: Color {
        switch self {
        case .white: .white
        case .yellow: .yellow
        case .green: .green
        case .red: .red
        case .black: Color(white: 0.15)
        }
    }

    var faces: [Int] {
        switch self {
        case .white:
            [1, 1, 1, 1, 2, 2, 2, 3, 3, 4, 5, 6]
        case .yellow:
            [1, 1, 2, 2, 2, 2, 3, 3, 4, 4, 5, 6]
        case .green:
            [1, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 6]
        case .red:
            [1, 2, 3, 3, 4, 4, 5, 5, 5, 5, 6, 6]
        case .black:
            [1, 2, 3, 4, 4, 5, 5, 5, 6, 6, 6, 6]
        }
    }

    func roll() -> Int {
        faces.randomElement() ?? 3
    }

    static func forAttacker(armies: Int) -> DiceColor {
        switch armies {
        case 1...3: .white
        case 4...7: .yellow
        case 8...12: .green
        case 13...18: .red
        default: .black
        }
    }

    static func forDefender(armies: Int) -> DiceColor {
        switch armies {
        case 1...6: .white
        case 7...12: .yellow
        case 13...20: .green
        default: .red
        }
    }
}