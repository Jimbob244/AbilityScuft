import { GameRulesState } from "./game_rules_state";
import {
    addModifierToHeroToPreventMovement,
    handleBalancerItem,
    reloadAndStartGame,
} from "./listener_helper_functions";
import { SettingsState } from "./settings_state";

export function handlePlayerReconnect(
    event: GameEventProvidedProperties & DotaPlayerReconnectedEvent
) {
    // Giving time to initialize the UI
    Timers.CreateTimer(5, () => {
        CustomGameEventManager.Send_ServerToAllClients("on_player_reconnect", {
            PlayerID: event.player_id as PlayerID,
        });
    });
}

export function handleDotaPlayerUsedAbility(
    event: GameEventProvidedProperties & DotaPlayerUsedAbilityEvent
) {
    if (event.abilityname === "item_tpscroll") {
        const caster = PlayerResource.GetSelectedHeroEntity(event.PlayerID);
        const itemIndex = caster?.FindItemInInventory("item_tpscroll");

        if (caster?.FindItemInInventory("item_travel_boots_2") !== undefined) {
            createItemCooldownTimer(itemIndex!, 10);
        }
        if (caster?.FindItemInInventory("item_travel_boots") !== undefined) {
            createItemCooldownTimer(itemIndex!, 15);
        }
    }
}

export function createItemCooldownTimer(
    itemIndex: CDOTA_Item,
    cooldown: number
) {
    Timers.CreateTimer(0.1, () => {
        itemIndex.EndCooldown();
        itemIndex.StartCooldown(cooldown);
    });
}

export function onNpcSpawned(event: NpcSpawnedEvent) {}

export function onStateChange(): void {
    const state = GameRules.State_Get();
    // Add 4 bots to lobby in tools
    if (IsInToolsMode() && state == GameState.CUSTOM_GAME_SETUP) {
        // Force pick a hero for dev
        for (let i = 0; i < 3; i++) {
            Tutorial.AddBot("npc_dota_hero_lina", "", "", false);
        }
        for (let i = 1; i < 3; i++) {
            Tutorial.AddBot("npc_dota_hero_lina", "", "", true);
        }
    }

    // Start game once pregame hits
    if (state === GameState.PRE_GAME) {
        Timers.CreateTimer(1, () => startGame());
    }
}

export function startGame(): void {
    addModifierToHeroToPreventMovement();
    reloadAndStartGame();
}

export function onThink(entity: CBaseEntity): void {
    const gameRulesState = GameRulesState.getInstance();
    const settingsState = SettingsState.getInstance();
    handleBalancerItem();
    if (gameRulesState._canRunAbilitySelectionOnThink === true) {
        gameRulesState._abilitySelection?.onThink();
    }
    if (
        settingsState.forceRandomAbilities &&
        !gameRulesState._abilityPickPhaseEnded
    ) {
        gameRulesState._abilitySelection?.mockPick();
    }
}

export function handleAbilitySwapEvent(event: AbilitySwapEvent): void {
    const hero = PlayerResource.GetSelectedHeroEntity(event.playerID);
    hero?.SwapAbilities(event.abilityName1, event.abilityName2, true, true);
}

export function handleAbilityReplaceEvent(event: AbilitySwapEvent): void {
    const hero = PlayerResource.GetSelectedHeroEntity(event.playerID);
    const abilityToRemove = event.abilityName1;
    const abilityToAdd = event.abilityName2;
    const ability1 = hero!.FindAbilityByName(abilityToRemove);
    const points = ability1!.GetLevel();
    hero?.SetAbilityPoints(hero.GetAbilityPoints() + points!);
    hero?.RemoveAbility(abilityToRemove);
    hero?.AddAbility(abilityToAdd);
    GameRulesState.getInstance().createPlayerAbilitySwapMenu(
        event.playerID,
        true
    );
}
