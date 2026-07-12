import Foundation

extension GameViewModel {

    func startDiplomacyPhase() {
        phase = .diplomacy
        pendingProposals = []
        generateAIDiplomacy()
        message = "Diplomacy phase — propose alliances or skip"
    }

    private func generateAIDiplomacy() {
        for player in players where !player.isHuman && player.isAlive {
            guard let general = player.generalID else { continue }
            if general.honorLevel > 0.6 && Double.random(in: 0...1) < 0.4 {
                let targets = players.filter { $0.isHuman && $0.isAlive }
                if let target = targets.first {
                    let level: AllianceLevel = general.honorLevel > 0.8 ? .level3 : .level1
                    pendingProposals.append(AllianceProposal(fromPlayerID: player.id, toPlayerID: target.id, level: level))
                }
            }
        }
        if !pendingProposals.isEmpty {
            showDiplomacy = true
        }
    }

    func proposeAlliance(to playerID: String, level: AllianceLevel) {
        let proposal = AllianceProposal(fromPlayerID: currentPlayer.id, toPlayerID: playerID, level: level)
        pendingProposals.append(proposal)

        guard let targetPlayer = players.first(where: { $0.id == playerID }),
              let general = targetPlayer.generalID else { return }

        var accepted = false
        let acceptChance = general.honorLevel * 0.5 + (1 - general.aggression) * 0.3
        if Double.random(in: 0...1) < acceptChance {
            accepted = true
        }

        if accepted {
            activeAlliances.append(ActiveAlliance(player1ID: currentPlayer.id, player2ID: playerID, level: level))
            message = "\(targetPlayer.name) accepted \(level.displayName)!"
        } else {
            message = "\(targetPlayer.name) declined your proposal"
        }
    }

    func respondToProposal(_ proposal: AllianceProposal, accept: Bool) {
        if accept {
            activeAlliances.append(ActiveAlliance(player1ID: proposal.fromPlayerID, player2ID: proposal.toPlayerID, level: proposal.level))
        }
        pendingProposals.removeAll { $0.id == proposal.id }
    }

    func handleAttackPlanningTap(_ id: TerritoryID) {
        guard let state = territories[id] else { return }

        if attackSource == nil {
            guard state.ownerID == currentPlayer.id else {
                message = "Select your territory to attack from"
                return
            }
            let available = availableArmiesForAttack(from: id)
            guard available > 0 else {
                message = "No armies available to commit from here"
                return
            }
            attackSource = id
            selectedTerritory = id
            message = "Select an adjacent enemy territory to attack"
        } else {
            guard state.ownerID != currentPlayer.id else {
                if state.ownerID == currentPlayer.id {
                    let available = availableArmiesForAttack(from: id)
                    if available > 0 {
                        attackSource = id
                        selectedTerritory = id
                        message = "Select an adjacent enemy territory to attack"
                    }
                }
                return
            }

            guard let source = attackSource,
                  let mapInfo = mapInfo(for: source),
                  mapInfo.neighbors.contains(id) else {
                message = "Must attack an adjacent territory"
                return
            }

            let available = availableArmiesForAttack(from: source)
            guard available > 0 else {
                message = "No armies available from this territory"
                attackSource = nil
                selectedTerritory = nil
                return
            }

            let order = AttackOrder(
                playerID: currentPlayer.id,
                sourceTerritory: source,
                targetTerritory: id,
                committedArmies: available
            )
            attackOrders.append(order)
            message = "Attack planned! \(available) armies from \(source.displayName) → \(id.displayName)"

            attackSource = nil
            selectedTerritory = nil
        }
    }

    func removeAttackOrder(id: UUID) {
        attackOrders.removeAll { $0.id == id }
    }

    func adjustAttackOrderArmies(orderID: UUID, newCount: Int) {
        guard let idx = attackOrders.firstIndex(where: { $0.id == orderID }) else { return }
        let maxAvailable = availableArmiesForAttack(from: attackOrders[idx].sourceTerritory) + attackOrders[idx].committedArmies
        attackOrders[idx].committedArmies = max(1, min(newCount, maxAvailable))
    }

    func confirmAttackPlan() {
        var allOrders = attackOrders

        for player in players where !player.isHuman && player.isAlive {
            let aiOrders = generateAIAttackOrders(for: player)
            allOrders.append(contentsOf: aiOrders)
        }

        allAttackOrders = allOrders
        phase = .battleResolution
        message = "Resolving battles..."

        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 300_000_000)
            resolveAllBattles()
        }
    }

    func generateAIAttackOrders(for player: Player) -> [AttackOrder] {
        guard let general = player.generalID else { return [] }
        var orders: [AttackOrder] = []
        let owned = territoriesForPlayer(player.id)
        let maxAttacks = general.aggression > 0.7 ? 4 : (general.aggression > 0.4 ? 2 : 1)

        var committed: [TerritoryID: Int] = [:]

        for _ in 0..<maxAttacks {
            var bestSource: TerritoryID?
            var bestTarget: TerritoryID?
            var bestRatio: Double = 0

            for territory in owned {
                guard let state = territories[territory] else { continue }
                let alreadyCommitted = committed[territory] ?? 0
                let available = state.armies - alreadyCommitted - 1
                guard available > 0 else { continue }

                let enemies = neighboringEnemies(of: territory)
                for enemy in enemies {
                    guard let enemyState = territories[enemy] else { continue }
                    let ratio = Double(available) / Double(enemyState.armies)
                    let threshold = general.riskTolerance > 0.7 ? 0.8 : (general.riskTolerance > 0.4 ? 1.2 : 1.8)

                    if ratio > threshold && ratio > bestRatio {
                        bestRatio = ratio
                        bestSource = territory
                        bestTarget = enemy
                    }
                }
            }

            guard let source = bestSource, let target = bestTarget else { break }
            let alreadyCommitted = committed[source] ?? 0
            let available = (territories[source]?.armies ?? 0) - alreadyCommitted - 1
            let commitCount = general.aggression > 0.8 ? available : max(1, available / 2)

            orders.append(AttackOrder(
                playerID: player.id,
                sourceTerritory: source,
                targetTerritory: target,
                committedArmies: commitCount
            ))
            committed[source] = alreadyCommitted + commitCount
        }

        return orders
    }

    func resolveAllBattles(roll: SameTimeEngine.DiceRoller = { $0.roll() }) {
        sameTimeBattleResults = []

        struct OrderedBattleBucket {
            let territory: TerritoryID
            let orders: [AttackOrder]
        }

        struct PendingSpoilsConflict {
            let territory: TerritoryID
            let defenderPlayerID: String
            let defenderArmiesBefore: Int
            let attackerResults: [CombatUnit]
            let spoilsCombatants: [CombatUnit]
            let originatingOrders: [AttackOrder]
        }

        func battlePairKey(_ t1: TerritoryID, _ t2: TerritoryID) -> String {
            [t1.rawValue, t2.rawValue].sorted().joined(separator: "|")
        }

        func makeAttackResults(for orders: [AttackOrder], attackerStates: [CombatUnit], winnerID: String?) -> [AttackResult] {
            orders.map { order in
                let remaining = attackerStates.first(where: {
                    $0.playerID == order.playerID && $0.sourceTerritory == order.sourceTerritory
                })
                return AttackResult(
                    playerID: order.playerID,
                    sourceTerritory: order.sourceTerritory,
                    armiesCommitted: order.committedArmies,
                    diceColor: DiceColor.forAttacker(armies: order.committedArmies),
                    roll: 0,
                    losses: order.committedArmies - (remaining?.armies ?? 0),
                    won: winnerID == order.playerID
                )
            }
        }

        func queueAutomaticSurge(from territory: TerritoryID, winnerID: String, into pendingSurgeOrders: inout [AttackOrder]) {
            let adjacentEnemy = (mapInfo(for: territory)?.neighbors ?? []).first {
                guard let neighborState = territories[$0] else { return false }
                return neighborState.ownerID != winnerID
            }

            if let surgeTarget = adjacentEnemy {
                let surgeArmies = max(0, (territories[territory]?.armies ?? 0) - 1)
                if surgeArmies > 0 {
                    pendingSurgeOrders.append(AttackOrder(
                        playerID: winnerID,
                        sourceTerritory: territory,
                        targetTerritory: surgeTarget,
                        committedArmies: surgeArmies,
                        isSurge: true
                    ))
                }
            }
        }

        var resolvedOrders = allAttackOrders
        var borderClashPairs: Set<String> = []
        var processedBorderOrderIDs: Set<UUID> = []
        var sourceArmyDeductions: [TerritoryID: Int] = [:]
        var unresolvedBorderClashResults: [SameTimeBattleResult] = []

        for order in allAttackOrders {
            sourceArmyDeductions[order.sourceTerritory, default: 0] += order.committedArmies
        }

        for idx in resolvedOrders.indices {
            let order = resolvedOrders[idx]
            guard !processedBorderOrderIDs.contains(order.id) else { continue }

            guard let counterpartIndex = resolvedOrders.firstIndex(where: {
                $0.sourceTerritory == order.targetTerritory &&
                $0.targetTerritory == order.sourceTerritory &&
                $0.playerID != order.playerID
            }) else {
                continue
            }

            let counterpart = resolvedOrders[counterpartIndex]
            guard !processedBorderOrderIDs.contains(counterpart.id) else { continue }

            let clashResult = SameTimeEngine.resolveBorderClash(
                army1: CombatUnit(playerID: order.playerID, armies: order.committedArmies, sourceTerritory: order.sourceTerritory),
                army2: CombatUnit(playerID: counterpart.playerID, armies: counterpart.committedArmies, sourceTerritory: counterpart.sourceTerritory),
                roll: roll
            )

            borderClashPairs.insert(battlePairKey(order.sourceTerritory, order.targetTerritory))
            processedBorderOrderIDs.insert(order.id)
            processedBorderOrderIDs.insert(counterpart.id)

            guard let clashResult else {
                let territory = order.targetTerritory
                let defenderOwner = territories[territory]?.ownerID ?? territories[order.sourceTerritory]?.ownerID ?? order.playerID
                let defenderArmies = territories[territory]?.armies ?? 0

                unresolvedBorderClashResults.append(SameTimeBattleResult(
                    territory: territory,
                    battleType: .borderClash,
                    attackerResults: [
                        AttackResult(
                            playerID: order.playerID,
                            sourceTerritory: order.sourceTerritory,
                            armiesCommitted: order.committedArmies,
                            diceColor: DiceColor.forAttacker(armies: order.committedArmies),
                            roll: 0,
                            losses: order.committedArmies,
                            won: false
                        ),
                        AttackResult(
                            playerID: counterpart.playerID,
                            sourceTerritory: counterpart.sourceTerritory,
                            armiesCommitted: counterpart.committedArmies,
                            diceColor: DiceColor.forAttacker(armies: counterpart.committedArmies),
                            roll: 0,
                            losses: counterpart.committedArmies,
                            won: false
                        )
                    ],
                    defenderPlayerID: defenderOwner,
                    defenderArmiesBefore: defenderArmies,
                    defenderLosses: 0,
                    newOwnerID: nil
                ))

                resolvedOrders[idx].committedArmies = 0
                resolvedOrders[counterpartIndex].committedArmies = 0
                continue
            }

            if clashResult.winnerID == order.playerID {
                resolvedOrders[idx].committedArmies = clashResult.winnerArmies
                resolvedOrders[counterpartIndex].committedArmies = 0
            } else {
                resolvedOrders[idx].committedArmies = 0
                resolvedOrders[counterpartIndex].committedArmies = clashResult.winnerArmies
            }
        }

        for (sourceTerritory, committedArmies) in sourceArmyDeductions {
            territories[sourceTerritory]?.armies -= committedArmies
            if (territories[sourceTerritory]?.armies ?? 0) < 1 {
                territories[sourceTerritory]?.armies = 1
            }
        }

        var groupedOrders: [TerritoryID: [AttackOrder]] = [:]
        var targetOrder: [TerritoryID] = []
        for order in resolvedOrders where order.committedArmies > 0 {
            if groupedOrders[order.targetTerritory] == nil {
                targetOrder.append(order.targetTerritory)
            }
            groupedOrders[order.targetTerritory, default: []].append(order)
        }

        let orderedBattles = targetOrder.compactMap { target -> OrderedBattleBucket? in
            guard let orders = groupedOrders[target], !orders.isEmpty else { return nil }
            return OrderedBattleBucket(territory: target, orders: orders)
        }

        var borderClashBattles: [OrderedBattleBucket] = []
        var massInvasionBattles: [OrderedBattleBucket] = []
        var standardInvasionBattles: [OrderedBattleBucket] = []
        var initialSurgeBattles: [OrderedBattleBucket] = []

        for bucket in orderedBattles {
            let isBorderClash = bucket.orders.contains { borderClashPairs.contains(battlePairKey($0.sourceTerritory, bucket.territory)) }
            if isBorderClash {
                borderClashBattles.append(bucket)
            } else if bucket.orders.contains(where: { $0.isSurge }) {
                initialSurgeBattles.append(bucket)
            } else if bucket.orders.count > 1 {
                massInvasionBattles.append(bucket)
            } else {
                standardInvasionBattles.append(bucket)
            }
        }

        var pendingSpoilsConflicts: [PendingSpoilsConflict] = []
        var pendingSurgeOrders: [AttackOrder] = []

        func resolveOrderedInvasionBuckets(_ buckets: [OrderedBattleBucket], battleType: SameTimeBattleType) {
            for bucket in buckets {
                guard let defState = territories[bucket.territory] else { continue }

                let attackers = bucket.orders.map { order in
                    CombatUnit(playerID: order.playerID, armies: order.committedArmies, sourceTerritory: order.sourceTerritory)
                }

                let result = SameTimeEngine.resolveBattle(
                    attackers: attackers,
                    defenderArmies: defState.armies,
                    roll: roll
                )

                territories[bucket.territory]?.armies = result.defenderRemaining

                if result.requiredSpoils {
                    pendingSpoilsConflicts.append(PendingSpoilsConflict(
                        territory: bucket.territory,
                        defenderPlayerID: defState.ownerID,
                        defenderArmiesBefore: defState.armies,
                        attackerResults: result.attackerResults,
                        spoilsCombatants: result.spoilsCombatants,
                        originatingOrders: bucket.orders
                    ))
                    continue
                }

                if let winnerID = result.winnerID {
                    let previousOwner = territories[bucket.territory]?.ownerID ?? defState.ownerID
                    territories[bucket.territory]?.ownerID = winnerID
                    territories[bucket.territory]?.armies = max(1, result.winnerArmies)

                    if let playerIdx = players.firstIndex(where: { $0.id == winnerID }) {
                        players[playerIdx].conqueredThisTurn = true
                    }

                    handleElimination(previousOwner: previousOwner)

                    if battleType != .surge {
                        queueAutomaticSurge(from: bucket.territory, winnerID: winnerID, into: &pendingSurgeOrders)
                    }
                }

                for atkResult in result.attackerResults where atkResult.armies > 0 && result.winnerID != atkResult.playerID {
                    territories[atkResult.sourceTerritory]?.armies += atkResult.armies
                }

                sameTimeBattleResults.append(SameTimeBattleResult(
                    territory: bucket.territory,
                    battleType: battleType,
                    attackerResults: makeAttackResults(for: bucket.orders, attackerStates: result.attackerResults, winnerID: result.winnerID),
                    defenderPlayerID: defState.ownerID,
                    defenderArmiesBefore: defState.armies,
                    defenderLosses: defState.armies - result.defenderRemaining,
                    newOwnerID: result.winnerID
                ))
            }
        }

        resolveOrderedInvasionBuckets(borderClashBattles, battleType: .borderClash)
        sameTimeBattleResults.append(contentsOf: unresolvedBorderClashResults)
        resolveOrderedInvasionBuckets(massInvasionBattles, battleType: .massInvasion)
        resolveOrderedInvasionBuckets(standardInvasionBattles, battleType: .standard)

        for conflict in pendingSpoilsConflicts {
            let spoilsResult = SameTimeEngine.resolveSpoilsOfWar(conflict.spoilsCombatants, roll: roll)
            var finalAttackers = conflict.attackerResults
            for i in finalAttackers.indices {
                if let updated = spoilsResult.first(where: {
                    $0.playerID == finalAttackers[i].playerID &&
                    $0.sourceTerritory == finalAttackers[i].sourceTerritory
                }) {
                    finalAttackers[i].armies = updated.armies
                }
            }

            let winner = spoilsResult.first(where: { $0.armies > 0 })
            if let winner {
                let previousOwner = territories[conflict.territory]?.ownerID ?? conflict.defenderPlayerID
                territories[conflict.territory]?.ownerID = winner.playerID
                territories[conflict.territory]?.armies = max(1, winner.armies)

                if let playerIdx = players.firstIndex(where: { $0.id == winner.playerID }) {
                    players[playerIdx].conqueredThisTurn = true
                }

                handleElimination(previousOwner: previousOwner)
                queueAutomaticSurge(from: conflict.territory, winnerID: winner.playerID, into: &pendingSurgeOrders)
            }

            for atkResult in finalAttackers where atkResult.armies > 0 && atkResult.playerID != winner?.playerID {
                territories[atkResult.sourceTerritory]?.armies += atkResult.armies
            }

            sameTimeBattleResults.append(SameTimeBattleResult(
                territory: conflict.territory,
                battleType: .spoilsOfWar,
                attackerResults: makeAttackResults(for: conflict.originatingOrders, attackerStates: finalAttackers, winnerID: winner?.playerID),
                defenderPlayerID: conflict.defenderPlayerID,
                defenderArmiesBefore: conflict.defenderArmiesBefore,
                defenderLosses: conflict.defenderArmiesBefore,
                newOwnerID: winner?.playerID
            ))
        }

        resolveOrderedInvasionBuckets(initialSurgeBattles, battleType: .surge)

        for surgeOrder in pendingSurgeOrders {
            guard let surgeDefState = territories[surgeOrder.targetTerritory],
                  territories[surgeOrder.sourceTerritory]?.ownerID == surgeOrder.playerID else { continue }

            territories[surgeOrder.sourceTerritory]?.armies -= surgeOrder.committedArmies
            if (territories[surgeOrder.sourceTerritory]?.armies ?? 0) < 1 {
                territories[surgeOrder.sourceTerritory]?.armies = 1
            }

            let surgeResult = SameTimeEngine.resolveBattle(
                attackers: [CombatUnit(playerID: surgeOrder.playerID, armies: surgeOrder.committedArmies, sourceTerritory: surgeOrder.sourceTerritory)],
                defenderArmies: surgeDefState.armies,
                roll: roll
            )

            territories[surgeOrder.targetTerritory]?.armies = surgeResult.defenderRemaining

            if let winnerID = surgeResult.winnerID {
                let previousOwner = territories[surgeOrder.targetTerritory]?.ownerID ?? surgeDefState.ownerID
                territories[surgeOrder.targetTerritory]?.ownerID = winnerID
                territories[surgeOrder.targetTerritory]?.armies = max(1, surgeResult.winnerArmies)
                if let playerIdx = players.firstIndex(where: { $0.id == winnerID }) {
                    players[playerIdx].conqueredThisTurn = true
                }
                handleElimination(previousOwner: previousOwner)
            }

            sameTimeBattleResults.append(SameTimeBattleResult(
                territory: surgeOrder.targetTerritory,
                battleType: .surge,
                attackerResults: [AttackResult(
                    playerID: surgeOrder.playerID,
                    sourceTerritory: surgeOrder.sourceTerritory,
                    armiesCommitted: surgeOrder.committedArmies,
                    diceColor: DiceColor.forAttacker(armies: surgeOrder.committedArmies),
                    roll: 0,
                    losses: surgeOrder.committedArmies - (surgeResult.attackerResults.first?.armies ?? 0),
                    won: surgeResult.winnerID == surgeOrder.playerID
                )],
                defenderPlayerID: surgeDefState.ownerID,
                defenderArmiesBefore: surgeDefState.armies,
                defenderLosses: surgeDefState.armies - surgeResult.defenderRemaining,
                newOwnerID: surgeResult.winnerID
            ))
        }

        for player in players where player.conqueredThisTurn {
            if let idx = players.firstIndex(where: { $0.id == player.id }) {
                if !cardDeck.isEmpty {
                    players[idx].cards.append(cardDeck.removeFirst())
                }
                players[idx].conqueredThisTurn = false
            }
        }

        checkWinCondition()

        if !gameOver {
            showBattleResolution = !sameTimeBattleResults.isEmpty
            if sameTimeBattleResults.isEmpty {
                startTacticalMovePhase()
            } else {
                currentBattleIndex = 0
                message = "Battle results — tap to continue"
            }
        }
    }

    func advanceBattleResolution() {
        currentBattleIndex += 1
        if currentBattleIndex >= sameTimeBattleResults.count {
            showBattleResolution = false
            startTacticalMovePhase()
        }
    }

    func startTacticalMovePhase() {
        phase = .fortify
        fortifySource = nil
        fortifyTarget = nil
        selectedTerritory = nil
        message = "One tactical move allowed, or end round"
    }

    func endSameTimeRound() {
        fortifySource = nil
        fortifyTarget = nil
        selectedTerritory = nil
        attackSource = nil
        attackTarget = nil
        attackOrders = []
        allAttackOrders = []
        surgeOrder = nil
        hasSurgeThisTurn = false

        activeAlliances.removeAll()

        roundNumber += 1
        turnNumber += 1

        if !gameOver {
            currentPlayerIndex = players.firstIndex(where: { $0.isHuman && $0.isAlive }) ?? 0
            startDiplomacyPhase()
        }
    }
}