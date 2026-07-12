import Foundation

enum CampaignCommandError: Error {
    case notPlayersTurn
    case territoryNotFound
    case territoryNotOwned
    case insufficientReserves
    case notAdjacent
    case destinationNotOwned
    case destinationNotHostile
    case insufficientMovableTroops
    case noFriendlyDestination
    case noBattleAvailable

    var message: String {
        switch self {
        case .notPlayersTurn:
            return "It is not your turn."
        case .territoryNotFound:
            return "Territory state could not be found."
        case .territoryNotOwned:
            return "You do not control that territory."
        case .insufficientReserves:
            return "Not enough reserve troops."
        case .notAdjacent:
            return "Territories are not adjacent."
        case .destinationNotOwned:
            return "Destination territory is not friendly."
        case .destinationNotHostile:
            return "Destination must be enemy-controlled."
        case .insufficientMovableTroops:
            return "Not enough movable troops."
        case .noFriendlyDestination:
            return "No valid friendly destination."
        case .noBattleAvailable:
            return "No battle is currently available."
        }
    }
}