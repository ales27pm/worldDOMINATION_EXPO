import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Bot, Landmark, Trophy, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { FieldPanel, ImperialDivider, SectionHeader } from "@/components/game/FieldPanel";
import { listCampaigns, listCommanderStats } from "@/db/repository";
import { OBJECTIVE_INFO } from "@/game/types";
import { cn } from "@/lib/utils";

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : format(date, "d MMM yyyy, HH:mm");
}

/** "Hall of Records" — the campaign archive and lifetime commander ledger. */
const RecordsPage = () => {
  const navigate = useNavigate();
  const campaignsQuery = useQuery({ queryKey: ["campaigns"], queryFn: () => listCampaigns() });
  const commandersQuery = useQuery({ queryKey: ["commander-stats"], queryFn: () => listCommanderStats() });

  const campaigns = campaignsQuery.data ?? [];
  const commanders = commandersQuery.data ?? [];
  const humanWins = campaigns.filter((c) => c.winnerIsHuman).length;
  const aiWins = campaigns.length - humanWins;
  const longest = campaigns.reduce((max, c) => Math.max(max, c.turns), 0);

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl px-4 py-8">
      <button
        type="button"
        onClick={() => navigate("/")}
        className="text-on-wood-muted mb-4 flex items-center gap-1.5 font-display text-[11px] uppercase tracking-imperial transition-colors hover:text-gold"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Main Hall
      </button>

      <div className="flex items-center gap-3">
        <Landmark className="h-7 w-7 text-[hsl(42_62%_66%)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
        <h1 className="text-gilded font-display text-3xl font-black">Hall of Records</h1>
      </div>
      <p className="text-on-wood-muted mt-1 font-body text-sm italic">
        Every concluded campaign, engraved in the imperial ledger.
      </p>
      <ImperialDivider className="my-5" />

      <FieldPanel className="animate-fade-up">
        <SectionHeader index={1} title="Campaign Ledger" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Campaigns", value: campaigns.length },
            { label: "Human Victories", value: humanWins },
            { label: "AI Victories", value: aiWins },
            { label: "Longest (turns)", value: longest },
          ].map((stat) => (
            <div key={stat.label} className="border border-gold-dim/40 bg-background/40 p-2.5 text-center">
              <p className="font-display text-2xl font-black text-gold">{stat.value}</p>
              <p className="mt-0.5 font-display text-[9px] uppercase tracking-imperial text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </FieldPanel>

      <FieldPanel className="mt-4 animate-fade-up">
        <SectionHeader index={2} title="Commanders of Renown" />
        {commanders.length === 0 ? (
          <p className="font-body text-sm italic text-muted-foreground">
            No commander has yet concluded a campaign.
          </p>
        ) : (
          <ul className="space-y-1">
            {commanders.slice(0, 10).map((commander, i) => (
              <li
                key={commander.name}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5",
                  i === 0 && commander.wins > 0 && "border border-gold-dim/60 bg-gold/10",
                )}
              >
                <span className="w-6 font-display text-[11px] font-bold text-gold">{i + 1}.</span>
                <span className="min-w-0 flex-1 truncate font-body text-sm font-semibold">{commander.name}</span>
                {commander.isHuman ? (
                  <User className="h-3.5 w-3.5 text-muted-foreground" aria-label="Human" />
                ) : (
                  <Bot className="h-3.5 w-3.5 text-muted-foreground" aria-label="AI general" />
                )}
                <span className="w-24 text-right font-display text-[11px] text-muted-foreground">
                  {commander.wins} {commander.wins === 1 ? "win" : "wins"} / {commander.games}
                </span>
              </li>
            ))}
          </ul>
        )}
      </FieldPanel>

      <FieldPanel className="mt-4 animate-fade-up">
        <SectionHeader index={3} title="Campaign Archive" />
        {campaignsQuery.isLoading ? (
          <p className="font-body text-sm italic text-muted-foreground">Consulting the archives...</p>
        ) : campaigns.length === 0 ? (
          <p className="font-body text-sm italic text-muted-foreground">
            The archive is empty. Conclude a campaign and history shall remember it.
          </p>
        ) : (
          <ul className="space-y-2">
            {campaigns.map((campaign) => (
              <li key={campaign.id} className="border border-gold-dim/40 bg-background/40 p-2.5">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-3.5 w-3.5 shrink-0 rounded-full border border-[#3a2812] shadow-[inset_-1px_-1px_1px_rgba(0,0,0,0.3),inset_1px_1px_1px_rgba(255,255,255,0.4)]"
                    style={{ backgroundColor: campaign.winnerColor }}
                  />
                  <span className="min-w-0 flex-1 truncate font-body text-sm font-semibold">
                    {campaign.winnerName}
                  </span>
                  <Trophy className="h-3.5 w-3.5 text-gold" aria-hidden />
                  <span className="font-display text-[10px] uppercase tracking-widest text-muted-foreground">
                    {OBJECTIVE_INFO[campaign.objective]?.name ?? campaign.objective}
                  </span>
                </div>
                <p className="mt-1 font-body text-xs italic text-muted-foreground">
                  {campaign.winReason ? `Victory by ${campaign.winReason}. ` : ""}
                  {campaign.turns} turns · {campaign.playerCount} commanders · {campaign.battles} battles ·{" "}
                  {campaign.territoryCount} territories
                </p>
                <p className="mt-0.5 font-display text-[9px] uppercase tracking-imperial text-muted-foreground/70">
                  {formatDate(campaign.completedAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </FieldPanel>
    </div>
  );
};

export default RecordsPage;
