import Observation

import SwiftUI

@Observable
@MainActor
class GameViewModel {
    var config = GameConfig()
    var territories: [TerritoryID: TerritoryState] = [:]
    var players: [Player] = []
    var currentPlayerIndex: Int = 0
    var phase: GamePhase = .setup
    var reinforcementsRemaining: Int = 0
    var selectedTerritory: TerritoryID?
    var attackSource: TerritoryID?
    var attackTarget: TerritoryID?
    var fortifySource: TerritoryID?
    var fortifyTarget: TerritoryID?
    var lastBattleResult: BattleResult?
    var showBattleResult: Bool = false
    var turnNumber: Int = 1
    var roundNumber: Int = 1
    var gameOver: Bool = false
    var winnerID: String?
    var cardDeck: [RiskCard] = []
    var tradeInCount: Int = 0
    var showCardTradeIn: Bool = false
    var attackDiceCount: Int = 3
    var message: String = ""
    var isAITurn: Bool = false
    var showDiceRoll: Bool = false
    var fortifyAmount: Int = 1

    var missions: [String: PlayerMission] = [:]
    var capitals: [String: TerritoryID] = [:]
    var activeAlliances: [ActiveAlliance] = []
    var pendingProposals: [AllianceProposal] = []
    var showDiplomacy: Bool = false
    var showMission: Bool = false
    var eliminatedByPlayer: [String: String] = [:]

    var attackOrders: [AttackOrder] = []
    var surgeOrder: AttackOrder?
    var hasSurgeThisTurn: Bool = false
    var allAttackOrders: [AttackOrder] = []
    var sameTimeBattleResults: [SameTimeBattleResult] = []
    var showBattleResolution: Bool = false
    var currentBattleIndex: Int = 0
    var reinforcementLimits: [TerritoryID: Int] = [:]
    var reinforcementsPlaced: [TerritoryID: Int] = [:]

    var currentPlayer: Player {
        players[currentPlayerIndex]
    }

    var currentPlayerTerritoryCount: Int {
        territories.values.filter { $0.ownerID == currentPlayer.id }.count
    }

    var isSameTime: Bool { config.mode == .sameTime }

    var activeMapInfos: [TerritoryMapInfo] {
        MapData.activeTerritories(
            includeExtra: config.useExtraTerritories,
            middleEastEastAfrica: config.middleEastEastAfricaConnection
        )
    }

    var activeMapByID: [TerritoryID: TerritoryMapInfo] {
        Dictionary(uniqueKeysWithValues: activeMapInfos.map { ($0.id, $0) })
    }

    func mapInfo(for territoryID: TerritoryID) -> TerritoryMapInfo? {
        activeMapByID[territoryID]
    }

    func setupGame(gameConfig: GameConfig, humanName: String, opponents: [GeneralID], colorOption: PlayerColorOption) {
        config = gameConfig
        currentPlayerIndex = 0
        turnNumber = 1
        roundNumber = 1
        gameOver = false
        winnerID = nil
        tradeInCount = 0
        showCardTradeIn = false
        missions = [:]
        capitals = [:]
        activeAlliances = []
        pendingProposals = []
        eliminatedByPlayer = [:]

        var usedColors: Set<Int> = [colorOption.rawValue]
        var allPlayers: [Player] = [
            Player(id: UUID().uuidString, name: humanName, colorOption: colorOption, isHuman: true, generalID: nil)
        ]

        for general in opponents {
            var colorIdx: Int
            repeat {
                colorIdx = Int.random(in: 0..<PlayerColorOption.allCases.count)
            } while usedColors.contains(colorIdx)
            usedColors.insert(colorIdx)
            let color = PlayerColorOption(rawValue: colorIdx) ?? .red
            allPlayers.append(Player(id: UUID().uuidString, name: general.displayName, colorOption: color, isHuman: false, generalID: general))
        }

        players = allPlayers
        setupDeck()
        distributeTerritories()

        if config.objective == .mission {
            assignMissions()
        }

        if config.objective == .capital {
            phase = .capitalSelection
            message = "Select a territory as your Capital"
        } else {
            phase = isSameTime ? .diplomacy : .reinforcement
            if isSameTime {
                startDiplomacyPhase()
            } else {
                calculateReinforcements()
                message = "Place your \(reinforcementsRemaining) reinforcements"
            }
        }
    }

    private func setupDeck() {
        var deck: [RiskCard] = []
        let activeTerritories = config.activeTerritoryIDs()
        let types: [CardType] = [.infantry, .cavalry, .artillery]

        for (i, territory) in activeTerritories.enumerated() {
            deck.append(RiskCard(type: types[i % 3], territoryID: territory))
        }
        deck.append(RiskCard(type: .wild, territoryID: nil))
        deck.append(RiskCard(type: .wild, territoryID: nil))
        cardDeck = deck.shuffled()
    }

    private func distributeTerritories() {
        switch config.territoryAllocation {
        case .random:
            territories = allocateTerritoriesRandomly()
        case .territoryGrab:
            territories = allocateTerritoriesByGrab()
        case .election:
            territories = allocateTerritoriesByElection()
        }

        seedStartingArmies()
    }

    private func allocateTerritoriesRandomly() -> [TerritoryID: TerritoryState] {
        let activeTerritories = config.activeTerritoryIDs().shuffled()
        var states: [TerritoryID: TerritoryState] = [:]
        var playerIdx = 0

        for territory in activeTerritories {
            states[territory] = TerritoryState(ownerID: players[playerIdx].id, armies: 1)
            playerIdx = (playerIdx + 1) % players.count
        }

        return states
    }

    private func allocateTerritoriesByGrab() -> [TerritoryID: TerritoryState] {
        let territories = config.activeTerritoryIDs()
        var remaining = Set(territories)
        var states: [TerritoryID: TerritoryState] = [:]
        var pickOrder = Array(players.indices).shuffled()
        var turn = 0

        while let picker = pickOrder[safe: turn % pickOrder.count], !remaining.isEmpty {
            let player = players[picker]
            let picked = bestTerritoryChoice(for: player.id, available: remaining, current: states)
            states[picked] = TerritoryState(ownerID: player.id, armies: 1)
            remaining.remove(picked)
            turn += 1
        }

        return states
    }

    private func allocateTerritoriesByElection() -> [TerritoryID: TerritoryState] {
        let activeTerritories = config.activeTerritoryIDs()
        var states: [TerritoryID: TerritoryState] = [:]

        // Ensure every player starts with at least one territory.
        var seed = activeTerritories.shuffled()
        for player in players {
            guard let territory = seed.popLast() else { break }
            states[territory] = TerritoryState(ownerID: player.id, armies: 1)
        }

        let totalElectionPoints = activeTerritories.count * 100
        var pointsByPlayer: [String: Int] = [:]
        let basePoints = totalElectionPoints / players.count
        for player in players {
            pointsByPlayer[player.id] = basePoints
        }

        var unclaimed = activeTerritories.filter { states[$0] == nil }.shuffled()
        while let territory = unclaimed.popLast() {
            var bestPlayerID: String?
            var bestBid = 0

            for player in players where player.isAlive {
                let pid = player.id
                let availablePoints = pointsByPlayer[pid] ?? 0
                if availablePoints <= 0 { continue }

                let influence = electionInfluence(for: pid, target: territory, current: states)
                let strategicValue = territoryStrategicValue(territory, playerID: pid, current: states)
                let targetBid = min(availablePoints, max(15, strategicValue + Int.random(in: 0...20) - influence))

                if targetBid > bestBid {
                    bestBid = targetBid
                    bestPlayerID = pid
                }
            }

            let winner = bestPlayerID ?? players.randomElement()!.id
            states[territory] = TerritoryState(ownerID: winner, armies: 1)
            pointsByPlayer[winner, default: 0] = max(0, (pointsByPlayer[winner] ?? 0) - bestBid)
        }

        return states
    }

    private func seedStartingArmies() {
        let armiesPerPlayer = max(20, 50 - (players.count * 5))
        var seeded = territories

        for player in players {
            let ownedTerritories = seeded.filter { $0.value.ownerID == player.id }.map { $0.key }
            var remaining = armiesPerPlayer - ownedTerritories.count
            while remaining > 0 {
                if let territory = ownedTerritories.randomElement() {
                    seeded[territory]!.armies += 1
                }
                remaining -= 1
            }
        }

        territories = seeded
    }

    private func bestTerritoryChoice(for playerID: String, available: Set<TerritoryID>, current: [TerritoryID: TerritoryState]) -> TerritoryID {
        guard let choice = available.max(by: { territoryStrategicValue($0, playerID: playerID, current: current) < territoryStrategicValue($1, playerID: playerID, current: current) }) else {
            return available.first ?? .alaska
        }
        return choice
    }

    private func electionInfluence(for playerID: String, target: TerritoryID, current: [TerritoryID: TerritoryState]) -> Int {
        guard let info = mapInfo(for: target) else { return 0 }
        let influencingNeighbors = info.neighbors.filter { current[$0]?.ownerID == playerID }
        return influencingNeighbors.count * 10
    }

    private func territoryStrategicValue(_ territory: TerritoryID, playerID: String, current: [TerritoryID: TerritoryState]) -> Int {
        guard let info = mapInfo(for: territory) else { return 0 }

        let continentWeight = info.continent.classicBonusArmies * 20
        let connectivityWeight = info.neighbors.count * 5
        let friendlyAdjacency = info.neighbors.filter { current[$0]?.ownerID == playerID }.count * 12
        let enemyAdjacency = info.neighbors.filter { owner in
            if let existing = current[owner]?.ownerID {
                return existing != playerID
            }
            return false
        }.count * 4

        return continentWeight + connectivityWeight + friendlyAdjacency + enemyAdjacency
    }

    private func assignMissions() {
        if isSameTime {
            missions = MissionGenerator.generateSameTimeMissions(players: players)
        } else {
            missions = MissionGenerator.generateClassicMissions(players: players, includeExtra: config.useExtraTerritories)
        }
    }

    var currentPlayerMustTradeCards: Bool {
        hasMandatoryTrade(for: currentPlayer.id)
    }

    func selectCapital(_ id: TerritoryID) {
        guard phase == .capitalSelection else { return }
        guard let state = territories[id], state.ownerID == currentPlayer.id else {
            message = "Select one of your territories as Capital"
            return
        }

        capitals[currentPlayer.id] = id

        let nextHumanNeeded = players.filter { $0.isHuman && capitals[$0.id] == nil }
        if nextHumanNeeded.isEmpty {
            for player in players where !player.isHuman && capitals[player.id] == nil {
                let owned = territoriesForPlayer(player.id)
                if let best = owned.max(by: { (territories[$0]?.armies ?? 0) < (territories[$1]?.armies ?? 0) }) {
                    capitals[player.id] = best
                }
            }

            phase = isSameTime ? .diplomacy : .reinforcement
            if isSameTime {
                startDiplomacyPhase()
            } else {
                calculateReinforcements()
                message = "Capital set! Place your \(reinforcementsRemaining) reinforcements"
            }
        }
    }

    func calculateReinforcements() {
        let playerID = currentPlayer.id
        let ownedTerritories = territoriesForPlayer(playerID)
        let ownedCount = ownedTerritories.count

        var reinforcements: Int

        if isSameTime {
            let contiguousSize = largestContiguousGroup(playerID: playerID)
            reinforcements = max(3, (ownedCount + contiguousSize) / 3)

            for continent in ContinentID.allCases {
                let continentTerrs = continent.territories(includeExtra: config.useExtraTerritories)
                if continentTerrs.allSatisfy({ territories[$0]?.ownerID == playerID }) {
                    reinforcements += continent.sameTimeBonusArmies
                }
            }

            calculateReinforcementLimits(playerID: playerID)
        } else {
            reinforcements = max(3, ownedCount / 3)

            for continent in ContinentID.allCases {
                let continentTerrs = continent.territories(includeExtra: config.useExtraTerritories)
                if continentTerrs.allSatisfy({ territories[$0]?.ownerID == playerID }) {
                    reinforcements += continent.classicBonusArmies
                }
            }
        }

        reinforcementsRemaining = reinforcements
        reinforcementsPlaced = [:]

        if currentPlayerMustTradeCards {
            showCardTradeIn = true
            message = "You must trade cards before placing reinforcements"
        }
    }

    func calculateReinforcementLimits(playerID: String) {
        var limits: [TerritoryID: Int] = [:]
        let owned = territoriesForPlayer(playerID)

        for territory in owned {
            let friendlyNeighbors = neighboringFriendlies(of: territory).count
            limits[territory] = friendlyNeighbors + 1
        }

        reinforcementLimits = limits
    }

    func largestContiguousGroup(playerID: String) -> Int {
        let owned = Set(territoriesForPlayer(playerID))
        var visited: Set<TerritoryID> = []
        var maxSize = 0

        for territory in owned {
            guard !visited.contains(territory) else { continue }
            var groupSize = 0
            var queue: [TerritoryID] = [territory]

            while !queue.isEmpty {
                let current = queue.removeFirst()
                guard !visited.contains(current) else { continue }
                visited.insert(current)
                groupSize += 1

                if let info = mapInfo(for: current) {
                    for neighbor in info.neighbors where owned.contains(neighbor) && !visited.contains(neighbor) {
                        queue.append(neighbor)
                    }
                }
            }

            maxSize = max(maxSize, groupSize)
        }

        return maxSize
    }

    func territoryTapped(_ id: TerritoryID) {
        guard !isAITurn else { return }

        switch phase {
        case .capitalSelection:
            selectCapital(id)
        case .reinforcement:
            handleReinforcementTap(id)
        case .attack:
            handleAttackTap(id)
        case .attackPlanning:
            handleAttackPlanningTap(id)
        case .fortify:
            handleFortifyTap(id)
        case .setup, .diplomacy, .battleResolution, .gameOver:
            break
        }
    }

    private func handleReinforcementTap(_ id: TerritoryID) {
        if currentPlayerMustTradeCards {
            showCardTradeIn = true
            message = "You must trade cards before placing reinforcements"
            return
        }

        guard let state = territories[id], state.ownerID == currentPlayer.id else {
            message = "Select one of your territories"
            return
        }
        guard reinforcementsRemaining > 0 else { return }

        if isSameTime {
            let limit = reinforcementLimits[id] ?? 1
            let placed = reinforcementsPlaced[id] ?? 0
            guard placed < limit else {
                message = "Max \(limit) reinforcements here (connected territories + 1)"
                return
            }
            reinforcementsPlaced[id] = placed + 1
        }

        territories[id]!.armies += 1
        reinforcementsRemaining -= 1

        if reinforcementsRemaining == 0 {
            if isSameTime {
                phase = .attackPlanning
                attackOrders = []
                surgeOrder = nil
                hasSurgeThisTurn = false
                message = "Plan your attacks. Tap source then target."
            } else {
                phase = .attack
                selectedTerritory = nil
                message = "Select a territory to attack from, or skip"
            }
        } else {
            message = "\(reinforcementsRemaining) reinforcements remaining"
        }
    }

    private func handleAttackTap(_ id: TerritoryID) {
        guard let state = territories[id] else { return }

        if attackSource == nil {
            guard state.ownerID == currentPlayer.id, state.armies > 1 else {
                message = "Select your territory with 2+ armies"
                return
            }
            attackSource = id
            selectedTerritory = id
            message = "Select an adjacent enemy territory to attack"
        } else if attackTarget == nil {
            guard state.ownerID != currentPlayer.id else {
                if state.ownerID == currentPlayer.id && territories[id]!.armies > 1 {
                    attackSource = id
                    selectedTerritory = id
                    message = "Select an adjacent enemy territory to attack"
                }
                return
            }

            guard let source = attackSource,
                  let mapInfo = mapInfo(for: source),
                  mapInfo.neighbors.contains(id) else {
                message = "Must attack an adjacent territory"
                return
            }

            attackTarget = id
            let sourceArmies = territories[source]!.armies
            attackDiceCount = min(3, sourceArmies - 1)
            executeAttack()
        }
    }

    func executeAttack() {
        guard let source = attackSource, let target = attackTarget else { return }
        let sourceArmies = territories[source]!.armies
        let targetArmies = territories[target]!.armies

        let attackCount = min(attackDiceCount, sourceArmies - 1)
        guard attackCount > 0 else { return }
        let defendCount = min(2, targetArmies)

        let attackRolls = (0..<attackCount).map { _ in Int.random(in: 1...6) }.sorted(by: >)
        let defendRolls = (0..<defendCount).map { _ in Int.random(in: 1...6) }.sorted(by: >)

        var attackerLosses = 0
        var defenderLosses = 0

        let comparisons = min(attackRolls.count, defendRolls.count)
        for i in 0..<comparisons {
            if attackRolls[i] > defendRolls[i] {
                defenderLosses += 1
            } else {
                attackerLosses += 1
            }
        }

        territories[source]!.armies -= attackerLosses
        territories[target]!.armies -= defenderLosses

        let conquered = territories[target]!.armies <= 0

        if conquered {
            let previousOwner = territories[target]!.ownerID
            territories[target]!.ownerID = currentPlayer.id
            let movedArmies = min(attackCount, territories[source]!.armies - 1)
            territories[target]!.armies = max(1, movedArmies)
            territories[source]!.armies -= movedArmies

            if territories[source]!.armies < 1 {
                territories[source]!.armies = 1
            }

            players[currentPlayerIndex].conqueredThisTurn = true
            handleElimination(previousOwner: previousOwner)
            checkWinCondition()
        }

        lastBattleResult = BattleResult(
            attackerDice: attackRolls,
            defenderDice: defendRolls,
            attackerLosses: attackerLosses,
            defenderLosses: defenderLosses,
            territoryConquered: conquered
        )
        showBattleResult = true

        attackSource = nil
        attackTarget = nil
        selectedTerritory = nil

        if !gameOver {
            message = conquered ? "Territory conquered! Continue attacking or skip" : "Attack again or skip to fortify"
        }
    }

    func handleElimination(previousOwner: String) {
        guard let idx = players.firstIndex(where: { $0.id == previousOwner }) else { return }
        let stillHasTerritories = territories.values.contains { $0.ownerID == previousOwner }
        if !stillHasTerritories {
            players[idx].isAlive = false
            eliminatedByPlayer[previousOwner] = currentPlayer.id
            let theirCards = players[idx].cards
            players[currentPlayerIndex].cards.append(contentsOf: theirCards)
            players[idx].cards.removeAll()
        }
    }

    func skipPhase() {
        guard !isAITurn else { return }
        switch phase {
        case .reinforcement:
            if currentPlayerMustTradeCards {
                message = "You must trade cards before ending reinforcement"
                showCardTradeIn = true
                return
            }
        case .diplomacy:
            if isSameTime {
                phase = .reinforcement
                calculateReinforcements()
                message = "Place your \(reinforcementsRemaining) reinforcements"
                if isSameTime {
                    message += " (limited by connections)"
                }
            }
        case .attack:
            if currentPlayer.conqueredThisTurn {
                drawCard()
            }
            phase = .fortify
            attackSource = nil
            attackTarget = nil
            selectedTerritory = nil
            message = "Select a territory to move armies from, or end turn"
        case .attackPlanning:
            confirmAttackPlan()
        case .fortify:
            if isSameTime {
                endSameTimeRound()
            } else {
                endTurn()
            }
        case .setup, .capitalSelection, .battleResolution, .gameOver:
            break
        }
    }

    private func handleFortifyTap(_ id: TerritoryID) {
        guard let state = territories[id] else { return }

        if fortifySource == nil {
            guard state.ownerID == currentPlayer.id, state.armies > 1 else {
                message = "Select your territory with 2+ armies"
                return
            }
            fortifySource = id
            selectedTerritory = id
            fortifyAmount = 1
            message = "Select an adjacent friendly territory"
        } else if fortifyTarget == nil {
            guard state.ownerID == currentPlayer.id else {
                message = "Must fortify to your own territory"
                return
            }

            guard let source = fortifySource,
                  let mapInfo = mapInfo(for: source),
                  mapInfo.neighbors.contains(id) else {
                message = "Must fortify to an adjacent territory"
                return
            }

            fortifyTarget = id
            let maxMove = territories[source]!.armies - 1
            fortifyAmount = min(fortifyAmount, maxMove)
            message = "Tap confirm to move \(fortifyAmount) armies"
        }
    }

    func executeFortify() {
        guard let source = fortifySource, let target = fortifyTarget else { return }
        let maxMove = territories[source]!.armies - 1
        let amount = min(fortifyAmount, maxMove)
        guard amount > 0 else { return }

        territories[source]!.armies -= amount
        territories[target]!.armies += amount

        if isSameTime {
            endSameTimeRound()
        } else {
            endTurn()
        }
    }

    func cancelFortify() {
        fortifySource = nil
        fortifyTarget = nil
        selectedTerritory = nil
        message = "Select a territory to fortify from, or end turn"
    }

    private func drawCard() {
        guard !cardDeck.isEmpty else { return }
        let card = cardDeck.removeFirst()
        players[currentPlayerIndex].cards.append(card)
    }

    func tradeCards(indices: [Int]) {
        guard phase == .reinforcement else {
            message = "Cards can only be traded during reinforcement"
            return
        }
        guard indices.count == 3 else { return }
        guard Set(indices).count == 3 else {
            message = "Choose 3 different cards"
            return
        }
        guard indices.allSatisfy({ $0 >= 0 && $0 < players[currentPlayerIndex].cards.count }) else {
            message = "Invalid card selection"
            return
        }

        let cards = indices.map { players[currentPlayerIndex].cards[$0] }
        let types = cards.map { $0.type }
        guard isValidCardSet(types) else {
            message = "Those cards do not form a valid set"
            return
        }

        tradeInCount += 1
        let bonusArmies = cardTradeValue(types: types)

        let removed = indices.sorted(by: >)
        for idx in removed {
            let card = players[currentPlayerIndex].cards.remove(at: idx)
            cardDeck.append(card)
        }
        cardDeck.shuffle()

        reinforcementsRemaining += bonusArmies

        for card in cards {
            if let territory = card.territoryID,
               territories[territory]?.ownerID == currentPlayer.id {
                territories[territory]!.armies += 2
            }
        }

        message = "Received \(bonusArmies) bonus armies! Place your reinforcements"

        if hasMandatoryTrade(for: currentPlayer.id) {
            showCardTradeIn = true
            message = "You must trade again (5+ cards remaining)"
        } else {
            showCardTradeIn = false
        }
    }

    private func hasMandatoryTrade(for playerID: String) -> Bool {
        guard let player = players.first(where: { $0.id == playerID }) else { return false }
        return player.cards.count >= 5
    }

    private func isValidCardSet(_ types: [CardType]) -> Bool {
        let nonWild = types.filter { $0 != .wild }
        let wildCount = types.count - nonWild.count
        if wildCount >= 2 { return true }
        if wildCount == 1 { return nonWild.count == 2 }
        let allSame = Set(types).count == 1
        let allDifferent = Set(types).count == 3
        return allSame || allDifferent
    }

    private func cardTradeValue(types: [CardType]) -> Int {
        switch config.cardTradeRule {
        case .ascending:
            switch tradeInCount {
            case 1: return 4
            case 2: return 6
            case 3: return 8
            case 4: return 10
            case 5: return 12
            case 6: return 15
            default: return 15 + (tradeInCount - 6) * 5
            }
        case .ascendingOneAtATime:
            return 3 + tradeInCount
        case .cardNature:
            let nonWild = types.filter { $0 != .wild }
            if Set(nonWild).count == 1 {
                switch nonWild.first ?? .infantry {
                case .infantry: return 4
                case .cavalry: return 6
                case .artillery: return 8
                case .wild: return 4
                }
            } else {
                return 10
            }
        }
    }

    func endTurn() {
        fortifySource = nil
        fortifyTarget = nil
        selectedTerritory = nil
        attackSource = nil
        attackTarget = nil
        players[currentPlayerIndex].conqueredThisTurn = false

        repeat {
            currentPlayerIndex = (currentPlayerIndex + 1) % players.count
            if currentPlayerIndex == 0 { turnNumber += 1 }
        } while !players[currentPlayerIndex].isAlive

        phase = .reinforcement
        calculateReinforcements()

        if currentPlayer.isHuman {
            isAITurn = false
            if currentPlayerMustTradeCards {
                showCardTradeIn = true
                message = "You must trade in cards (5+ cards)"
            } else {
                message = "Place your \(reinforcementsRemaining) reinforcements"
            }
        } else {
            isAITurn = true
            message = "\(currentPlayer.name) is thinking..."
            Task { @MainActor in
                try? await Task.sleep(nanoseconds: 600_000_000)
                executeAITurn()
            }
        }
    }

    func checkWinCondition() {
        switch config.objective {
        case .domination60, .domination80, .domination100:
            checkDominationWin()
        case .mission:
            checkMissionWin()
        case .capital:
            checkCapitalWin()
        }
    }

    private func checkDominationWin() {
        let target = config.dominationTarget
        for player in players where player.isAlive {
            let count = territoriesForPlayer(player.id).count
            if count >= target {
                gameOver = true
                phase = .gameOver
                winnerID = player.id
                message = "\(player.name) achieves domination!"
                return
            }
        }

        let alivePlayers = players.filter { $0.isAlive }
        if alivePlayers.count == 1 {
            gameOver = true
            phase = .gameOver
            winnerID = alivePlayers.first?.id
            message = "\(alivePlayers.first?.name ?? "Unknown") wins!"
        }
    }

    private func checkMissionWin() {
        if isSameTime && roundNumber < 3 {
            return
        }

        for player in players where player.isAlive {
            guard let mission = missions[player.id] else { continue }
            if isMissionComplete(mission, playerID: player.id) {
                gameOver = true
                phase = .gameOver
                winnerID = player.id
                message = "\(player.name) completed their mission!"
                return
            }
        }
    }

    private func isMissionComplete(_ mission: PlayerMission, playerID: String) -> Bool {
        switch mission.type {
        case .destroyPlayer(let targetID):
            let targetAlive = players.first(where: { $0.id == targetID })?.isAlive ?? false
            guard !targetAlive else { return false }

            if config.mode == .classic {
                if eliminatedByPlayer[targetID] == playerID {
                    return true
                }
                // In Classic mode, if someone else destroys the target,
                // the mission falls back to "Occupy 24 territories".
                return territoriesForPlayer(playerID).count >= 24
            }

            return eliminatedByPlayer[targetID] == playerID
        case .conquerContinents(let c1, let c2):
            return ownsContinent(playerID, c1) && ownsContinent(playerID, c2)
        case .occupyTerritoryCount(let count):
            return territoriesForPlayer(playerID).count >= count
        case .occupyWithArmies(let count, let armies):
            let qualifying = territories.filter { $0.value.ownerID == playerID && $0.value.armies >= armies }
            return qualifying.count >= count
        case .conquerContinentsPlusOne(let c1, let c2):
            guard ownsContinent(playerID, c1) && ownsContinent(playerID, c2) else { return false }
            return ContinentID.allCases.contains { $0 != c1 && $0 != c2 && ownsContinent(playerID, $0) }
        case .holdContinentPresenceAll:
            let ownsAny = ContinentID.allCases.contains { ownsContinent(playerID, $0) }
            let presenceAll = ContinentID.allCases.allSatisfy { continent in
                continent.territories(includeExtra: config.useExtraTerritories).contains {
                    territories[$0]?.ownerID == playerID
                }
            }
            return ownsAny && presenceAll
        case .conquerContinentPlusTerritories(let continent, let terrs):
            guard ownsContinent(playerID, continent) else { return false }
            return terrs.allSatisfy { territories[$0]?.ownerID == playerID }
        }
    }

    private func ownsContinent(_ playerID: String, _ continent: ContinentID) -> Bool {
        continent.territories(includeExtra: config.useExtraTerritories).allSatisfy {
            territories[$0]?.ownerID == playerID
        }
    }

    private func checkCapitalWin() {
        let target = config.capitalTarget(playerCount: players.count)
        for player in players where player.isAlive {
            guard let myCapital = capitals[player.id],
                  territories[myCapital]?.ownerID == player.id else { continue }

            var capturedCapitals = 0
            for (otherID, cap) in capitals where otherID != player.id {
                if territories[cap]?.ownerID == player.id {
                    capturedCapitals += 1
                }
            }

            if capturedCapitals >= target {
                gameOver = true
                phase = .gameOver
                winnerID = player.id
                message = "\(player.name) captured \(capturedCapitals) capitals!"
                return
            }
        }
    }

    func continentBonusesForPlayer(_ playerID: String) -> [(ContinentID, Int)] {
        ContinentID.allCases.compactMap { continent in
            let terrs = continent.territories(includeExtra: config.useExtraTerritories)
            let owns = terrs.allSatisfy { territories[$0]?.ownerID == playerID }
            let bonus = isSameTime ? continent.sameTimeBonusArmies : continent.classicBonusArmies
            return owns ? (continent, bonus) : nil
        }
    }

    func territoriesForPlayer(_ playerID: String) -> [TerritoryID] {
        territories.filter { $0.value.ownerID == playerID }.map { $0.key }
    }

    func neighboringEnemies(of territoryID: TerritoryID) -> [TerritoryID] {
        guard let info = mapInfo(for: territoryID),
              let state = territories[territoryID] else { return [] }
        return info.neighbors.filter {
            guard let s = territories[$0] else { return false }
            return s.ownerID != state.ownerID
        }
    }

    func neighboringFriendlies(of territoryID: TerritoryID) -> [TerritoryID] {
        guard let info = mapInfo(for: territoryID),
              let state = territories[territoryID] else { return [] }
        return info.neighbors.filter {
            guard let s = territories[$0] else { return false }
            return s.ownerID == state.ownerID
        }
    }

    func maxReinforcementsForTerritory(_ id: TerritoryID) -> Int {
        guard isSameTime else { return reinforcementsRemaining }
        let limit = reinforcementLimits[id] ?? 1
        let placed = reinforcementsPlaced[id] ?? 0
        return min(reinforcementsRemaining, limit - placed)
    }

    func missionForCurrentPlayer() -> PlayerMission? {
        missions[currentPlayer.id]
    }

    func availableArmiesForAttack(from territory: TerritoryID) -> Int {
        guard let state = territories[territory], state.ownerID == currentPlayer.id else { return 0 }
        let alreadyCommitted = attackOrders.filter { $0.sourceTerritory == territory }.reduce(0) { $0 + $1.committedArmies }
        return state.armies - alreadyCommitted - 1
    }
}

struct TerritoryState: Sendable {
    var ownerID: String
    var armies: Int
}


private extension Collection {
    subscript(safe index: Index) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}