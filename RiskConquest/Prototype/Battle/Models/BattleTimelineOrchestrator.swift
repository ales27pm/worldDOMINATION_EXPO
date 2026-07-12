import Foundation

@MainActor
final class BattleTimelineOrchestrator: ObservableObject {
    @Published private(set) var attacker: BattleParticipant?
    @Published private(set) var defender: BattleParticipant?
    @Published private(set) var winner: BattleSide?
    @Published private(set) var isRunning = false
    @Published private(set) var roundIndex = 0

    var onStateChange: ((BattleSide, BattleUnitStateMachine.State) -> Void)?
    var onHealthChanged: ((BattleSide, Int, Int) -> Void)?
    var onLog: ((String) -> Void)?
    var onBattleEnded: ((BattleSide) -> Void)?

    private var activeTask: Task<Void, Never>?

    func configure(attacker: BattleParticipant, defender: BattleParticipant) {
        cancel()
        self.attacker = attacker
        self.defender = defender
        self.winner = nil
        self.isRunning = false
        self.roundIndex = 0

        onHealthChanged?(.attacker, attacker.currentHealth, attacker.stats.maxHealth)
        onHealthChanged?(.defender, defender.currentHealth, defender.stats.maxHealth)
        onStateChange?(.attacker, .idle)
        onStateChange?(.defender, .idle)
        onLog?("Battle ready.")
    }

    func reset(attacker: BattleParticipant, defender: BattleParticipant) {
        configure(attacker: attacker, defender: defender)
    }

    func playRound() {
        guard !isRunning else { return }
        guard winner == nil else { return }
        guard attacker?.isAlive == true, defender?.isAlive == true else {
            finalizeWinnerIfNeeded()
            return
        }

        activeTask = Task { [weak self] in
            await self?.runRound()
        }
    }

    func autoResolve() {
        guard !isRunning else { return }
        guard winner == nil else { return }

        activeTask = Task { [weak self] in
            guard let self else { return }

            while !Task.isCancelled, self.winner == nil {
                await self.runRound()
                try? await Task.sleep(nanoseconds: 350_000_000)
            }
        }
    }

    func cancel() {
        activeTask?.cancel()
        activeTask = nil
        isRunning = false
    }

    private func runRound() async {
        guard !isRunning else { return }
        guard winner == nil else { return }
        guard attacker?.isAlive == true, defender?.isAlive == true else {
            finalizeWinnerIfNeeded()
            return
        }

        isRunning = true
        roundIndex += 1
        onLog?("Round \(roundIndex)")

        let order = initiativeOrder()

        for actingSide in order {
            if Task.isCancelled { break }
            if winner != nil { break }

            await runStrike(from: actingSide, to: actingSide.opposite)

            if winner != nil { break }
            if !(participant(for: .attacker)?.isAlive ?? false) || !(participant(for: .defender)?.isAlive ?? false) {
                finalizeWinnerIfNeeded()
                break
            }
        }

        if winner == nil {
            onStateChange?(.attacker, .idle)
            onStateChange?(.defender, .idle)
        }

        isRunning = false
    }

    private func initiativeOrder() -> [BattleSide] {
        guard let attacker, let defender else {
            return [.attacker, .defender]
        }

        if attacker.stats.initiative == defender.stats.initiative {
            return [.attacker, .defender]
        }

        return attacker.stats.initiative > defender.stats.initiative
            ? [.attacker, .defender]
            : [.defender, .attacker]
    }

    private func runStrike(from attackerSide: BattleSide, to defenderSide: BattleSide) async {
        guard var attacking = participant(for: attackerSide),
              var defending = participant(for: defenderSide),
              attacking.isAlive,
              defending.isAlive else {
            return
        }

        onLog?("\(attacking.displayName) attacks \(defending.displayName).")

        onStateChange?(attackerSide, .prepare)
        try? await Task.sleep(nanoseconds: 180_000_000)

        onStateChange?(attackerSide, .attack)
        try? await Task.sleep(nanoseconds: 140_000_000)

        onStateChange?(defenderSide, .impact)

        let outcome = BattleDamageResolver.resolve(attacker: attacking, defender: defending)
        defending.applyDamage(outcome.amount)
        updateParticipant(defending)

        onHealthChanged?(defenderSide, defending.currentHealth, defending.stats.maxHealth)

        if outcome.isCritical {
            onLog?("Critical hit for \(outcome.amount).")
        } else {
            onLog?("Hit for \(outcome.amount).")
        }

        try? await Task.sleep(nanoseconds: 120_000_000)

        if outcome.isLethal {
            onStateChange?(defenderSide, .die)
            onLog?("\(defending.displayName) has fallen.")
            try? await Task.sleep(nanoseconds: 260_000_000)
            finalizeWinnerIfNeeded()
            onStateChange?(attackerSide, .recover)
            try? await Task.sleep(nanoseconds: 120_000_000)
            onStateChange?(attackerSide, .idle)
        } else {
            onStateChange?(attackerSide, .recover)
            try? await Task.sleep(nanoseconds: 110_000_000)
            onStateChange?(defenderSide, .recover)
            try? await Task.sleep(nanoseconds: 100_000_000)
            onStateChange?(attackerSide, .idle)
            onStateChange?(defenderSide, .idle)
        }

        attacking = participant(for: attackerSide) ?? attacking
        defending = participant(for: defenderSide) ?? defending

        if !attacking.isAlive || !defending.isAlive {
            finalizeWinnerIfNeeded()
        }
    }

    private func finalizeWinnerIfNeeded() {
        guard winner == nil else { return }

        let attackerAlive = attacker?.isAlive ?? false
        let defenderAlive = defender?.isAlive ?? false

        if attackerAlive && !defenderAlive {
            winner = .attacker
        } else if defenderAlive && !attackerAlive {
            winner = .defender
        } else {
            return
        }

        if let winner {
            onLog?("\(winner.rawValue.capitalized) wins.")
            onBattleEnded?(winner)
        }
    }

    private func participant(for side: BattleSide) -> BattleParticipant? {
        switch side {
        case .attacker: return attacker
        case .defender: return defender
        }
    }

    private func updateParticipant(_ participant: BattleParticipant) {
        switch participant.side {
        case .attacker:
            attacker = participant
        case .defender:
            defender = participant
        }
    }
}