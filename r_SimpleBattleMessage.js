/*:
 * @plugindesc Side-view battle log: hides damage messages and displays other messages one at a time in a compact window.
 * @author renancacao
 *
 * @help
 * ============================================================
 * SIMPLE MESSAGE SIDE VIEW
 * ============================================================
 *
 * In side-view battles:
 *
 * - Damage messages are hidden.
 * - Damage numbers displayed directly on battlers are preserved.
 * - Other battle messages remain visible.
 * - Only one message is shown at a time.
 * - A short pause is added between messages.
 * - The message window is compact and is shown only while
 *   a message is being displayed.
 *
 * This plugin does not provide plugin commands.
 *
 * ============================================================
 */

(function () {

    // ============================================================
    // CONFIGURAÇÃO
    // ============================================================

    // Tempo que cada mensagem permanece na tela.
    // 60 frames = aproximadamente 1 segundo.
    var MESSAGE_WAIT = 60;

    // Altura da janela em linhas.
    var WINDOW_LINES = 1;

    // Aparência da janela.
    var WINDOW_OPACITY = 255;
    var WINDOW_BACK_OPACITY = 192;


    // ============================================================
    // DANO
    // ============================================================

    // Esconde somente as mensagens de dano recebido no side-view.
    //
    // Os números de dano desenhados diretamente sobre os battlers
    // continuam funcionando normalmente.
    //
    // Cura continua sendo exibida.
    var _Window_BattleLog_displayHpDamage =
        Window_BattleLog.prototype.displayHpDamage;

    Window_BattleLog.prototype.displayHpDamage = function (target) {
        if ($gameSystem.isSideView() &&
            target &&
            target.result() &&
            target.result().hpDamage > 0) {
            return;
        }

        _Window_BattleLog_displayHpDamage.call(this, target);
    };

    // ============================================================
    // REMOVE FAIXA DE FUNDO
    // ============================================================

    Window_BattleLog.prototype.backPaintOpacity = function () {
        return 0; // Altera a opacidade da faixa de 64 (padrão) para 0 (totalmente transparente)
    };


    // ============================================================
    // MENSAGENS
    // ============================================================

    // O Battle Log original pode manter várias linhas na janela.
    // Aqui usamos somente uma linha.
    //
    // Depois de mostrar a mensagem, adicionamos "clear" à fila.
    // Dessa forma:
    //
    //   mensagem -> espera -> limpa -> próxima mensagem
    //
    // A própria fila do Battle Log continua controlando a ordem das
    // ações e não precisamos criar uma segunda fila paralela.

    Window_BattleLog.prototype.addText = function (text) {
        // Show the window only while a message is active.
        this.visible = true;

        this._lines = [text];
        this.refresh();

        this._waitCount = MESSAGE_WAIT;

        // The clear command is processed after the wait.
        this.push('clear');
    };


    // ============================================================
    // ALTURA DA JANELA
    // ============================================================

    Window_BattleLog.prototype.numLines = function () {
        return WINDOW_LINES;
    };


    // ============================================================
    // TAMANHO DA JANELA
    // ============================================================

    // O numLines() sozinho não reduz a altura física da janela,
    // porque o Scene_Battle cria o Battle Log com uma altura própria.
    //
    // Ajustamos a janela depois que ela é criada.
    var _Scene_Battle_createLogWindow =
        Scene_Battle.prototype.createLogWindow;

    Scene_Battle.prototype.createLogWindow = function () {
        _Scene_Battle_createLogWindow.call(this);

        var window = this._logWindow;

        if (!window) {
            return;
        }

        window.height = window.fittingHeight(WINDOW_LINES);
        window.createContents();
        window.refresh();
    };


    // ============================================================
    // APARÊNCIA
    // ============================================================

    var _Window_BattleLog_initialize =
        Window_BattleLog.prototype.initialize;

    Window_BattleLog.prototype.initialize = function (x, y, width, height) {
        _Window_BattleLog_initialize.call(this, x, y, width, height);

        this.opacity = WINDOW_OPACITY;
        this.backOpacity = WINDOW_BACK_OPACITY;

        // Start hidden. addText() shows it when needed.
        this.visible = false;
    };


    // ============================================================
    // LIMPA E ESCONDE
    // ============================================================

    var _Window_BattleLog_clear =
        Window_BattleLog.prototype.clear;

    Window_BattleLog.prototype.clear = function () {
        _Window_BattleLog_clear.call(this);

        // Hide the entire window, including its background and text.
        this.visible = false;
    };

})();