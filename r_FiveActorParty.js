/*:
 * @plugindesc Five Actor Party - Permite 5 personagens na batalha e define uma formação vertical inclinada.
 * @author renancacao
 *
 * @help
 * ============================================================
 * FIVE ACTOR PARTY
 * ============================================================
 *
 * Permite que até 5 atores participem simultaneamente da batalha.
 *
 * A formação dos atores é definida por posições individuais.
 * A ideia é formar uma linha quase vertical, com uma pequena
 * inclinação.
 *
 * IMPORTANTE:
 * - Este plugin não altera o RetreatSystem.js.
 * - O RetreatSystem usa a posição atual do Sprite_Actor como
 *   referência para o recuo, portanto as posições abaixo servem
 *   apenas como formação inicial.
 *
 * ============================================================
 */

(function () {

    // =========================================================
    // CONFIGURAÇÃO
    // =========================================================

    var MAX_BATTLE_ACTORS = 5;

    /*
     * Posições iniciais dos atores.
     *
     * Ajuste estes valores depois de testar no jogo.
     *
     * X aumenta gradualmente para criar uma inclinação de
     * aproximadamente 85 graus, com espaçamento compacto.
     */
    var ACTOR_POSITIONS = [
        { x: 660, y: 220 },
        { x: 670, y: 260 },
        { x: 680, y: 305 },
        { x: 690, y: 350 },
        { x: 700, y: 395 }
    ];


    // =========================================================
    // PARTY - LIMITE DE ATORES NA BATALHA
    // =========================================================

    Game_Party.prototype.maxBattleMembers = function () {
        return MAX_BATTLE_ACTORS;
    };


    // =========================================================
    // SPRITE ACTOR - POSIÇÃO INICIAL
    // =========================================================

    var _Sprite_Actor_setActorHome =
        Sprite_Actor.prototype.setActorHome;

    Sprite_Actor.prototype.setActorHome = function (index) {
        var actor = this._actor;

        if (!actor) {
            _Sprite_Actor_setActorHome.call(this, index);
            return;
        }

        var battleMembers = $gameParty.battleMembers();
        var memberIndex = battleMembers.indexOf(actor);

        if (
            memberIndex >= 0 &&
            memberIndex < ACTOR_POSITIONS.length
        ) {
            var position = ACTOR_POSITIONS[memberIndex];

            this.setHome(
                position.x,
                position.y
            );

            return;
        }

        _Sprite_Actor_setActorHome.call(this, index);
    };


    // =========================================================
    // SPRITESET BATTLE - ATUALIZA POSIÇÃO DOS ATORES
    // =========================================================

    var _Spriteset_Battle_createActors =
        Spriteset_Battle.prototype.createActors;

    Spriteset_Battle.prototype.createActors = function () {
        _Spriteset_Battle_createActors.call(this);

        this._actorSprites.forEach(function (sprite) {
            if (!sprite || !sprite._actor) {
                return;
            }

            var actor = sprite._actor;
            var memberIndex =
                $gameParty.battleMembers().indexOf(actor);

            if (
                memberIndex >= 0 &&
                memberIndex < ACTOR_POSITIONS.length
            ) {
                var position =
                    ACTOR_POSITIONS[memberIndex];

                sprite.setHome(
                    position.x,
                    position.y
                );
            }
        });
    };


    // =========================================================
    //  AUMENTA A ALTURA DA JANELA NA BATALHA
    // =========================================================

    var _visibleRows = 5;

    /// Window_BattleStatus

    Window_BattleStatus.prototype.numVisibleRows = function () {
        return _visibleRows;
    };

    Window_BattleStatus.prototype.windowHeight = function () {
        return this.fittingHeight(_visibleRows);
    };


    /// Window_ActorCommand

    Window_ActorCommand.prototype.numVisibleRows = function () {
        return _visibleRows;
    }

    Window_ActorCommand.prototype.windowHeight = function () {
        return this.fittingHeight(_visibleRows);
    }


    /// Window_PartyCommand

    Window_PartyCommand.prototype.numVisibleRows = function () {
        return _visibleRows;
    }

    Window_PartyCommand.prototype.windowHeight = function () {
        return this.fittingHeight(_visibleRows);
    }


    // =========================================================
    // FIM
    // =========================================================

})();
