/*:
 * @plugindesc Battle UI - Cursor visual de seleção de alvos.
 * @author renancacao
 *
 * @help
 * ============================================================
 * BATTLE UI
 * ============================================================
 *
 * Nesta versão:
 *
 * - Mantém as janelas de seleção de inimigos e aliados visíveis.
 * - Adiciona uma seta sobre o alvo atualmente selecionado.
 * - A seta acompanha o Sprite_Battler do alvo.
 * - A seta funciona tanto para inimigos quanto para aliados.
 * - Funciona em ataques, magias, itens e outras ações que usem
 *   uma janela de seleção de alvo.
 *
 * A lógica de alcance, frente/retaguarda e seleção válida continua
 * sendo responsabilidade do Battle_Retreat.js.
 *
 * ============================================================
 */

(function () {

    // =========================================================
    // CONFIGURAÇÃO
    // =========================================================

    var CURSOR_WIDTH = 40;
    var CURSOR_HEIGHT = 32;
    var CURSOR_OFFSET_Y = 16;
    var CURSOR_BOB_PIXELS = 4;
    var CURSOR_BOB_SPEED = 0.08;

    // =========================================================
    // CRIA O CURSOR
    // =========================================================

    function createTargetCursor() {
        var sprite = new Sprite();

        sprite.bitmap = new Bitmap(
            CURSOR_WIDTH,
            CURSOR_HEIGHT
        );

        sprite.anchor.x = 0.5;
        sprite.anchor.y = 0.5;
        sprite.visible = false;

        sprite.bitmap.fontFace = 'GameFont';
        sprite.bitmap.fontSize = 28;
        sprite.bitmap.textColor = '#ffffff';
        sprite.bitmap.outlineColor = '#000000';
        sprite.bitmap.outlineWidth = 5;

        sprite.bitmap.drawText(
            '▼',
            0,
            -2,
            CURSOR_WIDTH,
            CURSOR_HEIGHT,
            'center'
        );

        return sprite;
    }

    // =========================================================
    // CRIA O CURSOR DA BATALHA
    // =========================================================

    var _Scene_Battle_createAllWindows =
        Scene_Battle.prototype.createAllWindows;

    Scene_Battle.prototype.createAllWindows = function () {
        _Scene_Battle_createAllWindows.call(this);

        this._targetSelectionCursor = createTargetCursor();

        this.addChild(this._targetSelectionCursor);
    };

    // =========================================================
    // ATUALIZA O CURSOR
    // =========================================================

    var _Scene_Battle_update =
        Scene_Battle.prototype.update;

    Scene_Battle.prototype.update = function () {
        _Scene_Battle_update.call(this);

        this.updateTargetSelectionCursor();
    };

    // =========================================================
    // IDENTIFICA A JANELA DE SELEÇÃO ATIVA
    // =========================================================

    Scene_Battle.prototype.getActiveTargetWindow = function () {
        if (this._enemyWindow && this._enemyWindow.active) {
            return this._enemyWindow;
        }

        if (this._actorWindow && this._actorWindow.active) {
            return this._actorWindow;
        }

        return null;
    };

    // =========================================================
    // ATUALIZA A POSIÇÃO DO CURSOR
    // =========================================================

    Scene_Battle.prototype.updateTargetSelectionCursor = function () {
        var cursor = this._targetSelectionCursor;
        var window = this.getActiveTargetWindow();

        if (!cursor || !window) {
            if (cursor) {
                cursor.visible = false;
            }
            return;
        }

        var target = this.getWindowTarget(window);

        if (!target || target.isDead()) {
            cursor.visible = false;
            return;
        }

        var sprite = this.findTargetSprite(target);

        if (!sprite) {
            cursor.visible = false;
            return;
        }

        var baseY =
            sprite.y -
            sprite.height / 2 -
            CURSOR_OFFSET_Y;

        var bob =
            Math.sin(Graphics.frameCount * CURSOR_BOB_SPEED) *
            CURSOR_BOB_PIXELS;

        cursor.x = sprite.x;
        cursor.y = baseY + bob;
        cursor.visible = true;
    };

    // =========================================================
    // OBTÉM O ALVO DA JANELA
    // =========================================================

    Scene_Battle.prototype.getWindowTarget = function (window) {
        if (!window) {
            return null;
        }

        if (window === this._enemyWindow) {
            if (typeof window.enemy === 'function') {
                return window.enemy();
            }
        }

        if (window === this._actorWindow) {
            if (typeof window.actor === 'function') {
                return window.actor();
            }
        }

        return null;
    };

    // =========================================================
    // ENCONTRA O SPRITE DO ALVO
    // =========================================================

    Scene_Battle.prototype.findTargetSprite = function (target) {
        if (!this._spriteset) {
            return null;
        }

        // -----------------------------------------------------
        // INIMIGOS
        // -----------------------------------------------------

        if (
            target.isEnemy &&
            target.isEnemy() &&
            this._spriteset._enemySprites
        ) {
            var enemySprites = this._spriteset._enemySprites;

            for (var i = 0; i < enemySprites.length; i++) {
                var enemySprite = enemySprites[i];

                if (
                    enemySprite &&
                    enemySprite._battler === target
                ) {
                    return enemySprite;
                }
            }
        }

        // -----------------------------------------------------
        // ATORES
        // -----------------------------------------------------

        if (
            target.isActor &&
            target.isActor() &&
            this._spriteset._actorSprites
        ) {
            var actorSprites = this._spriteset._actorSprites;

            for (var j = 0; j < actorSprites.length; j++) {
                var actorSprite = actorSprites[j];

                if (
                    actorSprite &&
                    actorSprite._battler === target
                ) {
                    return actorSprite;
                }
            }
        }

        return null;
    };

    // =========================================================
    // IMPEDE ESC DE VOLTAR PARA O ATOR ANTERIOR
    // =========================================================

    var _Scene_Battle_createActorCommandWindow = Scene_Battle.prototype.createActorCommandWindow;
    Scene_Battle.prototype.createActorCommandWindow = function () {
        _Scene_Battle_createActorCommandWindow.call(this);
        // Remove a função que faz o ESC voltar para o personagem anterior
        this._actorCommandWindow.setHandler('cancel', null);
    };

    // =========================================================
    // Salva o alvo quando o jogador confirma a seleção do inimigo
    // =========================================================

    // 1. Grava o índice do inimigo quando o jogador confirma o ataque/habilidade
    var _Scene_Battle_onEnemyOk = Scene_Battle.prototype.onEnemyOk;
    Scene_Battle.prototype.onEnemyOk = function () {
        var actor = BattleManager.actor();
        if (actor) {
            // Guarda qual a posição (índice) do inimigo no grupo (troop)
            actor._lastTargetEnemyIndex = this._enemyWindow.enemy().index();
        }
        _Scene_Battle_onEnemyOk.call(this);
    };

    // 2. Intercepta o momento em que a janela de inimigos é aberta na cena de batalha
    var _Scene_Battle_selectEnemySelection = Scene_Battle.prototype.selectEnemySelection;
    Scene_Battle.prototype.selectEnemySelection = function () {
        _Scene_Battle_selectEnemySelection.call(this);

        var actor = BattleManager.actor();
        if (actor && actor._lastTargetEnemyIndex !== undefined) {
            var troopMembers = $gameTroop.members();
            var savedIndex = actor._lastTargetEnemyIndex;

            // Procura o inimigo correspondente na batalha atual
            var enemy = troopMembers[savedIndex];

            // Se ele existir e ainda estiver vivo, força o cursor a focar nele
            if (enemy && enemy.isAlive()) {
                // No RPG Maker, a janela de inimigos filtra apenas os vivos, 
                // então precisamos achar a posição visual dele na lista atual.
                var visualIndex = this._enemyWindow._enemies.indexOf(enemy);
                if (visualIndex >= 0) {
                    this._enemyWindow.select(visualIndex);
                }
            }
        }
    };

})();