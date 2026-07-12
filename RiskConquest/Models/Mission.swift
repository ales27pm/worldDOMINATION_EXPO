import Foundation

enum MissionType: Sendable, Equatable {
    case destroyPlayer(targetPlayerID: String)
    case conquerContinents(ContinentID, ContinentID)
    case occupyTerritoryCount(Int)
    case occupyWithArmies(territoryCount: Int, armiesEach: Int)
    case conquerContinentsPlusOne(ContinentID, ContinentID)
    case holdContinentPresenceAll
    case conquerContinentPlusTerritories(continent: ContinentID, territories: [TerritoryID])

    static func == (lhs: MissionType, rhs: MissionType) -> Bool {
        switch (lhs, rhs) {
        case (.destroyPlayer(let a), .destroyPlayer(let b)): return a == b
        case (.conquerContinents(let a1, let a2), .conquerContinents(let b1, let b2)):
            return a1 == b1 && a2 == b2
        case (.occupyTerritoryCount(let a), .occupyTerritoryCount(let b)): return a == b
        case (.occupyWithArmies(let a1, let a2), .occupyWithArmies(let b1, let b2)):
            return a1 == b1 && a2 == b2
        case (.conquerContinentsPlusOne(let a1, let a2), .conquerContinentsPlusOne(let b1, let b2)):
            return a1 == b1 && a2 == b2
        case (.holdContinentPresenceAll, .holdContinentPresenceAll): return true
        case (.conquerContinentPlusTerritories(let a1, let a2), .conquerContinentPlusTerritories(let b1, let b2)):
            return a1 == b1 && a2 == b2
        default: return false
        }
    }
}

struct PlayerMission: Sendable {
    let playerID: String
    let type: MissionType
    let description: String
    var fallbackDescription: String?
    var completed: Bool = false
}

enum MissionGenerator {
    static func generateClassicMissions(players: [Player], includeExtra: Bool) -> [String: PlayerMission] {
        var missions: [String: PlayerMission] = [:]
        var availableMissions: [MissionType] = []

        let continentPairs: [(ContinentID, ContinentID)] = [
            (.asia, .africa),
            (.northAmerica, .australia),
            (.asia, .southAmerica),
            (.northAmerica, .africa),
        ]

        for pair in continentPairs {
            availableMissions.append(.conquerContinents(pair.0, pair.1))
        }

        availableMissions.append(.occupyTerritoryCount(24))
        availableMissions.append(.occupyWithArmies(territoryCount: 18, armiesEach: 2))
        availableMissions.append(.conquerContinentsPlusOne(.europe, .australia))
        availableMissions.append(.conquerContinentsPlusOne(.europe, .southAmerica))

        for player in players {
            let otherPlayers = players.filter { $0.id != player.id }
            if let target = otherPlayers.randomElement() {
                availableMissions.append(.destroyPlayer(targetPlayerID: target.id))
            }
        }

        availableMissions.shuffle()

        for (index, player) in players.enumerated() {
            let missionType = availableMissions[index % availableMissions.count]
            let description = describeClassicMission(missionType, players: players)
            missions[player.id] = PlayerMission(playerID: player.id, type: missionType,
                description: description, fallbackDescription: "Occupy 24 territories")
        }

        return missions
    }

    static func generateSameTimeMissions(players: [Player]) -> [String: PlayerMission] {
        var missions: [String: PlayerMission] = [:]
        var availableMissions: [(MissionType, String)] = []

        availableMissions.append((.holdContinentPresenceAll,
            "Hold any continent & have presence in all others"))

        let continentPairs: [(ContinentID, ContinentID)] = [
            (.asia, .southAmerica), (.africa, .northAmerica),
            (.europe, .australia), (.europe, .southAmerica)
        ]
        for pair in continentPairs {
            availableMissions.append((.conquerContinents(pair.0, pair.1),
                "Conquer \(pair.0.displayName) and \(pair.1.displayName)"))
        }

        for player in players {
            let otherPlayers = players.filter { $0.id != player.id }
            if let target = otherPlayers.randomElement() {
                availableMissions.append((.destroyPlayer(targetPlayerID: target.id),
                    "Destroy all armies belonging to \(target.name)"))
            }
        }

        availableMissions.shuffle()

        for (index, player) in players.enumerated() {
            let (mType, desc) = availableMissions[index % availableMissions.count]
            missions[player.id] = PlayerMission(playerID: player.id, type: mType, description: desc)
        }

        return missions
    }

    private static func describeClassicMission(_ type: MissionType, players: [Player]) -> String {
        switch type {
        case .destroyPlayer(let targetID):
            let name = players.first(where: { $0.id == targetID })?.name ?? "Unknown"
            return "Destroy all armies belonging to \(name)"
        case .conquerContinents(let c1, let c2):
            return "Conquer \(c1.displayName) and \(c2.displayName)"
        case .occupyTerritoryCount(let count):
            return "Occupy \(count) territories"
        case .occupyWithArmies(let count, let armies):
            return "Occupy \(count) territories with \(armies)+ armies each"
        case .conquerContinentsPlusOne(let c1, let c2):
            return "Conquer \(c1.displayName), \(c2.displayName) & one more continent"
        case .holdContinentPresenceAll:
            return "Hold any continent & have presence in all others"
        case .conquerContinentPlusTerritories(let c, let ts):
            let names = ts.map { $0.displayName }.joined(separator: ", ")
            return "Conquer \(c.displayName) plus \(names)"
        }
    }
}