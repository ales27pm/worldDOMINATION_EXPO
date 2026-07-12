import Foundation

extension GameViewModel {
    func executeAITurn() {
        guard let general = currentPlayer.generalID else {
            endTurn()
            return
        }

        while currentPlayerMustTradeCards {
            let traded = autoTradeCards()
            if !traded {
                message = "AI could not find a valid mandatory trade set"
                break
            }
        }

        if currentPlayer.cards.count >= 3 && general.aggression > 0.6 {
            _ = autoTradeCards()
        }

        aiReinforce(personality: general)
        aiAttack(personality: general)

        if currentPlayer.conqueredThisTurn {
            drawCardForAI()
        }

        aiFortify(personality: general)

        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 400_000_000)
            endTurn()
        }
    }

    @discardableResult
    private func autoTradeCards() -> Bool {
        let cards = players[currentPlayerIndex].cards
        guard cards.count >= 3 else { return false }

        for i in 0..<cards.count {
            for j in (i+1)..<cards.count {
                for k in (j+1)..<cards.count {
                    let types = [cards[i].type, cards[j].type, cards[k].type]
                    if isValidSetForAI(types) {
                        tradeCards(indices: [i, j, k])
                        return true
                    }
                }
            }
        }
        return false
    }

    private func isValidSetForAI(_ types: [CardType]) -> Bool {
        let nonWild = types.filter { $0 != .wild }
        let wildCount = types.count - nonWild.count
        if wildCount >= 2 { return true }
        if wildCount == 1 { return nonWild.count == 2 }
        return Set(types).count == 1 || Set(types).count == 3
    }

    private func aiReinforce(personality: GeneralID) {
        let playerID = currentPlayer.id
        let owned = territoriesForPlayer(playerID)

        var borderTerritories = owned.filter { !neighboringEnemies(of: $0).isEmpty }
        if borderTerritories.isEmpty { borderTerritories = owned }

        borderTerritories.sort { t1, t2 in
            let enemies1 = neighboringEnemies(of: t1).count
            let enemies2 = neighboringEnemies(of: t2).count
            let armies1 = territories[t1]?.armies ?? 0
            let armies2 = territories[t2]?.armies ?? 0

            if personality.aggression > 0.7 {
                return enemies1 > enemies2
            } else {
                return armies1 < armies2
            }
        }

        while reinforcementsRemaining > 0 && !borderTerritories.isEmpty {
            let targetIdx: Int
            if personality.unpredictability > 0.5 && Double.random(in: 0...1) < personality.unpredictability * 0.3 {
                targetIdx = Int.random(in: 0..<borderTerritories.count)
            } else {
                targetIdx = 0
            }

            let target = borderTerritories[targetIdx]

            if isSameTime {
                let limit = reinforcementLimits[target] ?? 1
                let placed = reinforcementsPlaced[target] ?? 0
                if placed >= limit {
                    borderTerritories.remove(at: targetIdx)
                    continue
                }
                reinforcementsPlaced[target] = placed + 1
            }

            territories[target]!.armies += 1
            reinforcementsRemaining -= 1
        }

        phase = .attack
    }

    @discardableResult
    private func aiAttack(personality: GeneralID) -> Int {
        let playerID = currentPlayer.id
        var attacksMade = 0
        let maxAttacks = personality.aggression > 0.8 ? 15 : (personality.aggression > 0.5 ? 8 : 4)

        for _ in 0..<maxAttacks {
            let owned = territoriesForPlayer(playerID)
            var bestSource: TerritoryID?
            var bestTarget: TerritoryID?
            var bestRatio: Double = 0

            for territory in owned {
                guard let state = territories[territory], state.armies > 1 else { continue }
                let enemies = neighboringEnemies(of: territory)

                for enemy in enemies {
                    guard let enemyState = territories[enemy] else { continue }
                    let ratio = Double(state.armies) / Double(enemyState.armies)

                    let threshold = personality.riskTolerance > 0.7 ? 1.0 :
                                   (personality.riskTolerance > 0.4 ? 1.5 : 2.0)

                    if ratio > threshold && ratio > bestRatio {
                        bestRatio = ratio
                        bestSource = territory
                        bestTarget = enemy
                    }
                }
            }

            guard let source = bestSource, let target = bestTarget else { break }

            attackSource = source
            attackTarget = target
            let sourceArmies = territories[source]!.armies
            attackDiceCount = min(3, sourceArmies - 1)
            executeAttack()
            attacksMade += 1

            if gameOver { break }
        }

        return attacksMade
    }

    private func aiFortify(personality: GeneralID) {
        let playerID = currentPlayer.id
        let owned = territoriesForPlayer(playerID)

        var bestSource: TerritoryID?
        var bestTarget: TerritoryID?
        var bestNeed: Double = 0

        for territory in owned {
            guard let state = territories[territory], state.armies > 2 else { continue }
            let enemies = neighboringEnemies(of: territory)
            if enemies.isEmpty {
                let friends = neighboringFriendlies(of: territory)
                for friend in friends {
                    let friendEnemies = neighboringEnemies(of: friend)
                    if !friendEnemies.isEmpty {
                        let need = Double(friendEnemies.count) / Double(territories[friend]?.armies ?? 1)
                        if need > bestNeed {
                            bestNeed = need
                            bestSource = territory
                            bestTarget = friend
                        }
                    }
                }
            }
        }

        if let source = bestSource, let target = bestTarget {
            let amount = territories[source]!.armies - 1
            territories[source]!.armies -= amount
            territories[target]!.armies += amount
        }
    }

    private func drawCardForAI() {
        guard !cardDeck.isEmpty else { return }
        let card = cardDeck.removeFirst()
        players[currentPlayerIndex].cards.append(card)
    }
}