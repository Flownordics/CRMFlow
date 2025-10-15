# Kanban Board Forbedringer

## ✅ Implementerede Features

### 1. Nyeste Deal Øverst
Når en deal flyttes til et nyt stage, placeres den automatisk øverst (position 0).

**Teknisk:** `index: 0` sendes til `reorder_deal` funktionen.

### 2. Begrænset Visning af Won/Lost Stages

#### Konfiguration
Won og Lost stages viser nu kun de **10 seneste deals** som standard:

```typescript
const STAGE_LIMITS: Record<string, number> = {
    won: 10,
    lost: 10,
    vundet: 10,
    tabt: 10,
    'closed won': 10,
    'closed lost': 10,
};
```

#### Funktionalitet
- **Badge viser total antal**: Selvom kun 10 vises, viser badge det totale antal deals i stagen
- **"Vis X flere" knap**: Hvis der er mere end 10 deals, vises en knap til at udvide visningen
- **"Vis færre" knap**: Når udvidet, kan man kollapse tilbage til de 10 seneste
- **Automatisk kollaps**: Som standard vises kun de 10 seneste for at holde UI overskueligt

#### Eksempel
```
Won (47)  [kun top 10 vises]
└─ Deal 1 (senest)
└─ Deal 2
...
└─ Deal 10
└─ [Vis 37 flere] ← Klik for at udvide
```

#### Tilpasning
For at ændre grænsen, juster værdierne i `STAGE_LIMITS`:

```typescript
// I src/components/deals/KanbanBoard.tsx
const STAGE_LIMITS: Record<string, number> = {
    won: 15,        // Vis 15 i stedet for 10
    lost: 15,
    vundet: 15,
    tabt: 15,
};
```

## Fordele

### Performance
- **Mindre DOM nodes**: Færre elements at rendere = hurtigere UI
- **Mindre re-renders**: React memoization virker bedre med færre elements
- **Hurtigere scrolling**: Mindre indhold at scrolle gennem

### UX
- **Overskueligt**: Brugeren bliver ikke overvældet af lange lister
- **Fokus på aktive deals**: De seneste/vigtigste deals er altid synlige
- **On-demand detaljer**: Bruger kan udvide hvis de har brug for at se ældre deals

### Skalerbarhed
- **Håndterer vækst**: Systemet kan have hundredvis af Won/Lost deals uden at UI bliver langsomt
- **Fleksibel konfiguration**: Let at justere grænser per stage efter behov

## Tekniske Detaljer

### State Management
```typescript
const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
```
- Tracker hvilke stages der er udvidet
- Bruger Set for O(1) lookup performance

### Rendering Logic
```typescript
const allDeals = dealsByStage[col.id] ?? [];
const limit = getStageLimit(col.name);
const isLimited = isLimitedStage(col.name);
const isExpanded = expandedStages.has(col.id);
const visibleDeals = (isLimited && !isExpanded) ? allDeals.slice(0, limit) : allDeals;
```

### Drag & Drop Compatibility
- Alle deals (også skjulte) er stadig i `SortableContext`
- Man kan stadig trække deals til og fra kollapset stages
- Drag & drop påvirkes ikke af visningsbegrænsningen

## Testing

### Test Scenario 1: Flyt Deal til Won
1. Træk en deal til Won stage
2. **Forventet:** Dealen placeres øverst i Won
3. **Forventet:** Hvis Won har >10 deals, vises "Vis X flere" knappen

### Test Scenario 2: Udvid/Kollaps
1. Klik på "Vis X flere" i Won
2. **Forventet:** Alle deals vises nu
3. **Forventet:** "Vis færre" knap vises
4. Klik "Vis færre"
5. **Forventet:** Kun de 10 øverste vises igen

### Test Scenario 3: Badge Count
1. Tjek badge på Won stage med 47 deals
2. **Forventet:** Badge viser "47", selvom kun 10 deals vises

## Fremtidige Forbedringer

### Muligheder for videreudvikling:
1. **Pagination**: I stedet for "Vis alle", vis "Vis næste 10"
2. **Search/Filter**: Søg i alle deals, også skjulte
3. **Persistence**: Husk hvilke stages brugeren har udvidet (localStorage)
4. **Archive mode**: Flyt meget gamle Won/Lost deals til et separat arkiv
5. **Virtual scrolling**: For stages med 100+ deals, brug virtualisering

## Konfigurationsoversigt

| Stage Name | Limit | Bemærkning |
|------------|-------|------------|
| Won / Vundet | 10 | Ofte mange afsluttede deals |
| Lost / Tabt | 10 | Ofte mange tabte deals |
| Closed Won | 10 | Alias for Won |
| Closed Lost | 10 | Alias for Lost |
| Andre stages | 50 | Default grænse (generøs) |

For at tilføje flere stages til begrænsning:
```typescript
const STAGE_LIMITS: Record<string, number> = {
    won: 10,
    lost: 10,
    vundet: 10,
    tabt: 10,
    'negotiation': 20,  // Tilføj custom stage
};
```

