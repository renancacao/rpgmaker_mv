/*:
 * @plugindesc Battle Retreat - Sistema de frente/retaguarda e alcance.
 * @author renancacao
 *
 * @help
 * ============================================================
 * BATTLE RETREAT
 * ============================================================
 *
 * State ID 12 = Recuado
 *
 * Regras:
 *
 * - Um personagem pode Recuar se existir outro aliado vivo
 *   que não esteja Recuado.
 *
 * - Um personagem Recuado pode usar ataques à distância.
 *
 * - Um personagem Recuado não pode usar ataques corpo a corpo.
 *
 * - Um personagem Recuado não pode ser atingido por ataques
 *   corpo a corpo.
 *
 * - Se todos os aliados da frente morrerem ou estiverem Recuados,
 *   o personagem Recuado fica EXPOSO.
 *
 * - Quando exposto:
 *      - pode ser atingido por ataques corpo a corpo;
 *      - pode usar ataques corpo a corpo;
 *      - continua visualmente na posição recuada.
 *
 * Tags de habilidades:
 *
 * <melee>
 *      Ataque corpo a corpo.
 *
 * <ranged>
 *      Ataque à distância.
 *
 * <weapon>
 *      Usa a classificação da arma do ator.
 *
 * Sem nenhuma tag:
 *      Corpo a corpo.
 *
 * Tags de armas:
 *
 * <melee>
 *      Arma corpo a corpo.
 *
 * <ranged>
 *      Arma à distância.
 *
 * Sem nenhuma tag:
 *      Corpo a corpo.
 *
 * ============================================================
 */

(function () {

    // =========================================================
    // CONFIGURAÇÃO

    // =========================================================
    var STATE_ID_RECUADO = 12;
    var RECUO_PIXELS = 50;

    // =========================================================
    // ALIADOS

    // =========================================================
    function getAllies(battler) {
        if (!battler) {
            return [];
        }
        if (battler.isActor()) {
            return $gameParty.battleMembers();
        }
        return $gameTroop.members();
    }

    // =========================================================
    // PODE RECUAR?

    // =========================================================
    function canRetreat(battler) {
        if (!battler) {
            return false;
        }
        // Se já está recuado, pode avançar.
        if (battler.isStateAffected(STATE_ID_RECUADO)) {
            return true;
        }
        var members = getAllies(battler);
        for (var i = 0; i < members.length; i++) {
            var member = members[i];
            if (
                member !== battler &&
                !member.isDead() &&
                !member.isStateAffected(STATE_ID_RECUADO)
            ) {
                return true;
            }
        }
        return false;
    }

    // =========================================================
    // EXISTE ALIADO NA FRENTE?

    // =========================================================
    function hasFrontAlly(battler) {
        if (!battler) {
            return false;
        }
        var members = getAllies(battler);
        for (var i = 0; i < members.length; i++) {
            var member = members[i];
            if (member === battler) {
                continue;
            }
            if (member.isDead()) {
                continue;
            }
            if (!member.isStateAffected(STATE_ID_RECUADO)) {
                return true;
            }
        }
        return false;
    }

    // =========================================================
    // ESTÁ EFETIVAMENTE NA RETAGUARDA?

    // =========================================================
    function isEffectivelyRear(battler) {
        if (!battler) {
            return false;
        }
        return (
            battler.isStateAffected(STATE_ID_RECUADO) &&
            hasFrontAlly(battler)
        );
    }

    // =========================================================
    // POSIÇÃO LÓGICA

    // =========================================================
    function getBattlerPosition(battler) {
        if (!battler) {
            return 'front';
        }
        if (isEffectivelyRear(battler)) {
            return 'rear';
        }
        return 'front';
    }

    // =========================================================
    // POSIÇÃO VISUAL

    // =========================================================
    //
    // A posição visual é independente da posição lógica.
    //
    // Isso permite que um personagem:
    //
    // - continue visualmente atrás;
    // - fique exposto quando o personagem da frente morrer.
    //

    // =========================================================
    function getVisualPosition(battler) {
        if (!battler) {
            return 'front';
        }
        // A posição visual é independente da posição lógica.
        // Enquanto o estado Recuado existir, o sprite permanece atrás,
        // mesmo quando o personagem estiver EXPOSO.
        if (battler.isStateAffected(STATE_ID_RECUADO)) {
            return 'rear';
        }
        // Quando o battler morre, o RPG Maker limpa seus estados.
        // _retreatVisual preserva a posição durante a animação de morte.
        if (battler.isDead() && battler._retreatVisual) {
            return 'rear';
        }
        return 'front';
    }

    // =========================================================
    // DISTÂNCIA DA HABILIDADE

    // =========================================================
    function getSkillRange(battler, skill) {
        if (!skill) {
            return 'melee';
        }
        var meta = skill.meta;
        // <melee>
        if (meta.melee !== undefined) {
            return 'melee';
        }
        // <ranged>
        if (meta.ranged !== undefined) {
            return 'ranged';
        }
        // <weapon>
        if (meta.weapon !== undefined) {
            // Inimigos não usam classificação de arma.
            if (!battler.isActor || !battler.isActor()) {
                return 'melee';
            }
            var weapons = battler.weapons();
            if (!weapons || weapons.length === 0) {
                return 'melee';
            }
            var weapon = weapons[0];
            if (weapon.meta.ranged !== undefined) {
                return 'ranged';
            }
            if (weapon.meta.melee !== undefined) {
                return 'melee';
            }
            // Sem classificação = melee.
            return 'melee';
        }
        // Sem tag = melee.
        return 'melee';
    }

    // =========================================================
    // DISTÂNCIA DO ATAQUE BÁSICO

    // =========================================================
    function getAttackRange(battler) {
        if (!battler) {
            return 'melee';
        }

        var skill = $dataSkills[battler.attackSkillId()];

        if (!skill) {
            return 'melee';
        }

        // O ataque normal dos inimigos funciona como <weapon>,
        // mas inimigos não possuem arma para fornecer a classificação.
        // Portanto, para inimigos, o ataque normal é sempre melee.
        if (!battler.isActor()) {
            return 'melee';
        }

        return getSkillRange(battler, skill);
    }

    // =========================================================
    // COMANDO DO ATOR

    // =========================================================
    var _Window_ActorCommand_makeCommandList =
        Window_ActorCommand.prototype.makeCommandList;
    Window_ActorCommand.prototype.makeCommandList = function () {
        _Window_ActorCommand_makeCommandList.call(this);
        var actor = this._actor;
        if (!actor) {
            return;
        }
        var rear = isEffectivelyRear(actor);
        // Ataque básico.
        if (rear && getAttackRange(actor) === 'melee') {
            for (var i = 0; i < this._list.length; i++) {
                if (this._list[i].symbol === 'attack') {
                    this._list[i].enabled = false;
                }
            }
        }
        // Adiciona Recuar / Avançar.
        var text = actor.isStateAffected(STATE_ID_RECUADO)
            ? 'Avançar'
            : 'Recuar';
        this.addCommand(
            text,
            'direct_recuar',
            canRetreat(actor)
        );
    };

    // =========================================================
    // VALIDA O COMANDO ATAQUE DINAMICAMENTE

    // =========================================================
    // O RPG Maker pode manter a lista de comandos do ator em cache.
    // Isso permite que, após recuar e avançar para o próximo ator,
    // o jogador volte com ESC e encontre o comando Ataque ainda
    // habilitado.
    //
    // A verificação aqui é dinâmica e também protege o handler
    // commandAttack() contra esse mesmo caso.
    // =========================================================
    var _Window_ActorCommand_isCurrentItemEnabled =
        Window_ActorCommand.prototype.isCurrentItemEnabled;

    Window_ActorCommand.prototype.isCurrentItemEnabled = function () {
        var enabled =
            _Window_ActorCommand_isCurrentItemEnabled.call(this);

        if (!enabled) {
            return false;
        }

        var actor = this._actor;

        if (!actor) {
            return enabled;
        }

        if (
            this.currentSymbol &&
            this.currentSymbol() === 'attack' &&
            isEffectivelyRear(actor) &&
            getAttackRange(actor) === 'melee'
        ) {
            return false;
        }

        return enabled;
    };

    // =========================================================
    // PROTEGE A EXECUÇÃO DO ATAQUE

    // =========================================================
    var _Scene_Battle_commandAttack =
        Scene_Battle.prototype.commandAttack;

    Scene_Battle.prototype.commandAttack = function () {
        var actor = BattleManager.actor();

        if (
            actor &&
            isEffectivelyRear(actor) &&
            getAttackRange(actor) === 'melee'
        ) {
            this._actorCommandWindow.activate();
            return;
        }

        _Scene_Battle_commandAttack.call(this);
    };

    // =========================================================

    // =========================================================
    // DESABILITA HABILIDADES MELEE NA RETAGUARDA

    // =========================================================
    var _Window_BattleSkill_isEnabled =
        Window_BattleSkill.prototype.isEnabled;
    Window_BattleSkill.prototype.isEnabled = function (item) {
        var enabled =
            _Window_BattleSkill_isEnabled.call(this, item);
        if (!enabled) {
            return false;
        }
        var actor = this._actor;
        if (!actor || !item) {
            return enabled;
        }
        if (
            isEffectivelyRear(actor) &&
            getSkillRange(actor, item) === 'melee'
        ) {
            return false;
        }
        return enabled;
    };

    // =========================================================
    // HANDLER DO COMANDO RECUAR

    // =========================================================
    var _Scene_Battle_createActorCommandWindow =
        Scene_Battle.prototype.createActorCommandWindow;
    Scene_Battle.prototype.createActorCommandWindow = function () {
        _Scene_Battle_createActorCommandWindow.call(this);
        this._actorCommandWindow.setHandler(
            'direct_recuar',
            this.commandDirectRetreat.bind(this)
        );
    };

    // =========================================================
    // EXECUTA RECUAR / AVANÇAR

    // =========================================================
    Scene_Battle.prototype.commandDirectRetreat = function () {
        var actor = BattleManager.actor();
        if (!actor) {
            return;
        }

        // -----------------------------------------------------
        // AVANÇAR
        // -----------------------------------------------------
        if (actor.isStateAffected(STATE_ID_RECUADO)) {
            actor.removeState(STATE_ID_RECUADO);
            actor._retreatVisual = false;

            if (BattleManager._logWindow) {
                BattleManager._logWindow.push(
                    'addText',
                    actor.name() + ' avançou!'
                );
                BattleManager._logWindow.push('wait');
            }
        }

        // -----------------------------------------------------
        // RECUAR
        // -----------------------------------------------------
        else {
            if (!canRetreat(actor)) {
                return;
            }

            actor.addState(STATE_ID_RECUADO);
            actor._retreatVisual = true;

            if (BattleManager._logWindow) {
                BattleManager._logWindow.push(
                    'addText',
                    actor.name() + ' recuou!'
                );
                BattleManager._logWindow.push('wait');
            }
        }

        BattleManager.selectNextCommand();
    };

    // =========================================================
    // PODE ATACAR O ALVO?

    // =========================================================
    function canAttackTargetByRange(subject, target, range) {
        if (!subject || !target) {
            return true;
        }
        // Ataques à distância podem atingir qualquer posição.
        if (range === 'ranged') {
            return true;
        }
        // Ataque melee não alcança alguém efetivamente recuado.
        if (
            range === 'melee' &&
            isEffectivelyRear(target)
        ) {
            return false;
        }
        return true;
    }

    // =========================================================
    // =========================================================
    // TARGET WINDOW - INIMIGO
    // =========================================================
    var _Window_BattleEnemy_isCurrentItemEnabled =
        Window_BattleEnemy.prototype.isCurrentItemEnabled;

    Window_BattleEnemy.prototype.isCurrentItemEnabled = function () {
        var enabled =
            _Window_BattleEnemy_isCurrentItemEnabled.call(this);

        if (!enabled) {
            return false;
        }

        var action = BattleManager.inputtingAction();

        if (!action) {
            return enabled;
        }

        var subject = action.subject();
        var target = this.enemy();
        var range = getSkillRange(
            subject,
            action.item()
        );

        return canAttackTargetByRange(
            subject,
            target,
            range
        );
    };

    // =========================================================
    // TARGET WINDOW - ATOR
    // =========================================================
    var _Window_BattleActor_isCurrentItemEnabled =
        Window_BattleActor.prototype.isCurrentItemEnabled;

    Window_BattleActor.prototype.isCurrentItemEnabled = function () {
        var enabled =
            _Window_BattleActor_isCurrentItemEnabled.call(this);

        if (!enabled) {
            return false;
        }

        var action = BattleManager.inputtingAction();

        if (!action) {
            return enabled;
        }

        var subject = action.subject();
        var target = this.actor();
        var range = getSkillRange(
            subject,
            action.item()
        );

        return canAttackTargetByRange(
            subject,
            target,
            range
        );
    };

    // =========================================================
    // =========================================================
    // DESENHO DOS ALVOS - INIMIGO
    // =========================================================
    // Cada inimigo é avaliado individualmente para que os alvos
    // inalcançáveis permaneçam visíveis, porém desabilitados.
    // =========================================================

    var _Window_BattleEnemy_drawItem =
        Window_BattleEnemy.prototype.drawItem;

    Window_BattleEnemy.prototype.drawItem = function (index) {
        var enemy = this._enemies[index];

        if (!enemy) {
            return;
        }

        var rect = this.itemRectForText(index);
        var enabled = true;
        var action = BattleManager.inputtingAction();

        if (action) {
            var subject = action.subject();
            var range = getSkillRange(
                subject,
                action.item()
            );

            enabled = canAttackTargetByRange(
                subject,
                enemy,
                range
            );
        }

        this.changePaintOpacity(enabled);

        this.drawText(
            enemy.name(),
            rect.x,
            rect.y,
            rect.width,
            'center'
        );

        this.changePaintOpacity(true);
    };

    // =========================================================

    // =========================================================

    // GAME ACTION - VALIDADE

    // =========================================================
    var _Game_Action_isValid =
        Game_Action.prototype.isValid;
    Game_Action.prototype.isValid = function () {
        var valid =
            _Game_Action_isValid.call(this);
        if (!valid) {
            return false;
        }
        var subject = this.subject();
        if (!subject) {
            return valid;
        }
        var range = getSkillRange(
            subject,
            this.item()
        );
        // Personagem efetivamente recuado não pode usar melee.
        if (
            isEffectivelyRear(subject) &&
            range === 'melee'
        ) {
            return false;
        }
        return true;
    };

    // =========================================================
    // GAME ACTION - RETARGETING DE MELEE
    // =========================================================
    // Quando o alvo é escolhido automaticamente (principalmente
    // pelas ações dos inimigos), a janela de seleção não participa
    // da decisão. Por isso, ataques melee precisam respeitar aqui
    // a regra de frente/retaguarda.
    //
    // Se o alvo original estiver efetivamente recuado e existir
    // pelo menos um aliado dele na frente, o ataque é redirecionado
    // para um alvo da frente.
    //
    // Se não existir ninguém na frente, o personagem recuado fica
    // exposto e pode ser atingido normalmente.
    // =========================================================

    var _Game_Action_makeTargets =
        Game_Action.prototype.makeTargets;

    Game_Action.prototype.makeTargets = function () {
        var targets = _Game_Action_makeTargets.call(this);
        var subject = this.subject();

        if (!subject || !targets || targets.length === 0) {
            return targets;
        }

        var range;

        // O ataque normal de inimigos é sempre melee.
        if (
            subject.isEnemy &&
            subject.isEnemy() &&
            this.item() === $dataSkills[subject.attackSkillId()]
        ) {
            range = 'melee';
        } else {
            range = getSkillRange(
                subject,
                this.item()
            );
        }

        // Ataques ranged ignoram a formação.
        if (range !== 'melee') {
            return targets;
        }

        var unit = this.opponentsUnit();

        if (!unit) {
            return targets;
        }

        var frontTargets = [];

        for (var i = 0; i < unit.members().length; i++) {
            var member = unit.members()[i];

            if (
                member &&
                !member.isDead() &&
                !isEffectivelyRear(member)
            ) {
                frontTargets.push(member);
            }
        }

        // Se não existe ninguém na frente, quem está recuado
        // fica exposto e pode ser atingido.
        if (frontTargets.length === 0) {
            return targets;
        }

        for (var j = 0; j < targets.length; j++) {
            var target = targets[j];

            if (
                target &&
                isEffectivelyRear(target)
            ) {
                // Para ações de alvo único, mantém a escolha de
                // um alvo da frente. Para ações com múltiplos
                // alvos, substitui apenas o alvo inalcançável.
                targets[j] =
                    frontTargets[
                        Math.floor(Math.random() * frontTargets.length)
                    ];
            }
        }

        return targets;
    };

    // =========================================================

    // =========================================================
    // INIMIGOS - ESCOLHA DE AÇÕES

    // =========================================================
    //
    // IMPORTANTE:
    //
    // Não mostramos a mensagem aqui.
    //
    // makeActions() acontece durante a preparação do turno.
    //
    // Apenas removemos ações corpo a corpo e marcamos que o
    // inimigo não possui ação válida.
    //

    // =========================================================
    var _Game_Enemy_makeActions =
        Game_Enemy.prototype.makeActions;
    Game_Enemy.prototype.makeActions = function () {
        _Game_Enemy_makeActions.call(this);
        this._cannotAttackFromRear = false;
        if (!isEffectivelyRear(this)) {
            return;
        }
        var validActions = [];
        for (var i = 0; i < this._actions.length; i++) {
            var action = this._actions[i];
            if (!action) {
                continue;
            }
            var item = action.item();
            if (!item) {
                continue;
            }
            var range = getSkillRange(
                this,
                item
            );
            // Ataque melee não pode ser usado da retaguarda.
            if (range === 'melee') {
                continue;
            }
            validActions.push(action);
        }
        this._actions = validActions;
        if (this._actions.length === 0) {
            this._cannotAttackFromRear = true;
        }
    };

    // =========================================================
    // MENSAGEM DO INIMIGO SEM ATAQUE

    // =========================================================
    //
    // A mensagem só aparece quando chega efetivamente a vez
    // do inimigo.
    //

    // =========================================================
    var _BattleManager_processTurn =
        BattleManager.processTurn;
    BattleManager.processTurn = function () {
        var subject = this._subject;
        if (
            subject &&
            subject.isEnemy &&
            subject.isEnemy() &&
            subject._cannotAttackFromRear
        ) {
            subject._cannotAttackFromRear = false;
            if (this._logWindow) {
                this._logWindow.push(
                    'addText',
                    subject.name() +
                    ' não consegue atacar da retaguarda!'
                );
                this._logWindow.push('wait');
            }
        }
        _BattleManager_processTurn.call(this);
    };

    // =========================================================
    // POSIÇÃO VISUAL DO SPRITE

    // =========================================================
    var _Sprite_Battler_updatePosition =
        Sprite_Battler.prototype.updatePosition;
    Sprite_Battler.prototype.updatePosition = function () {
        _Sprite_Battler_updatePosition.call(this);
        var battler = this._battler;
        if (!battler) {
            return;
        }
        var position = getVisualPosition(battler);
        // Atores recuam para a direita.
        if (battler.isActor()) {
            if (position === 'rear') {
                this.x += RECUO_PIXELS;
            }
        }
        // Inimigos recuam para a esquerda.
        else {
            if (position === 'rear') {
                this.x -= RECUO_PIXELS;
            }
        }
    };

})();