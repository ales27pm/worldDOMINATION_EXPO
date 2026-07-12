import Foundation

struct CampaignEventFeedSnapshot: Equatable {
    let recentEvents: [CampaignEvent]
    let recentEventIDs: [CampaignEvent.ID]
    let visibleEventIDs: Set<CampaignEvent.ID>
    let newestEventID: CampaignEvent.ID?
    let newestTurnLabel: String?
    let showsEmptyState: Bool

    init(events: [CampaignEvent], limit: Int = 4) {
        let boundedLimit = max(0, limit)
        let recentEvents = Array(events.prefix(boundedLimit))

        self.recentEvents = recentEvents
        self.recentEventIDs = recentEvents.map(\.id)
        self.visibleEventIDs = Set(recentEventIDs)
        self.newestEventID = recentEvents.first?.id
        self.newestTurnLabel = recentEvents.first.map { "Turn \($0.turn)" }
        self.showsEmptyState = recentEvents.isEmpty
    }

    func shouldHighlightNewest(comparedTo previousNewestEventID: CampaignEvent.ID?) -> Bool {
        guard let newestEventID else { return false }
        guard let previousNewestEventID else { return false }
        return newestEventID != previousNewestEventID
    }
}