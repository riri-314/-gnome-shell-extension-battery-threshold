/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const Gettext = imports.gettext;
const { GObject } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const QuickSettings = imports.ui.quickSettings;
const QuickSettingsMenu = imports.ui.main.panel.statusArea.quickSettings;

const Domain = Gettext.domain(Me.metadata.uuid);
const _ = Domain.gettext;

//const DisplayBackend = Me.imports.dbus;

const LAST_SCALE_KEY = 'last-selected-display-scale';

// Round scale values to multiple of 25 % just like Gnome Settings
function scaleToPercentage(scale) {
    return Math.floor(scale * 4 + 0.5) * 25;
}

const DisplayScaleQuickMenuToggle = GObject.registerClass(
    class DisplayScaleQuickMenuToggle extends QuickSettings.QuickMenuToggle {

        _init() {
            // Set QuickMenu name and icon
            super._init({
                label: _('Battery threshold'),
                iconName: 'battery-level-100-discharged-symbolic',
                toggleMode: true,
            });
            // This function is unique to this class. It adds a nice header with an
            // icon, title and optional subtitle. It's recommended you do so for
            // consistency with other menus.
            this.menu.setHeader('selection-mode-symbolic', 'Battery threshold',
                'Preserve your battery');
            
            // You may also add sections of items to the menu
            this._itemsSection = new PopupMenu.PopupMenuSection();
            this._itemsSection.addAction('100%', () => log('activated'));
            this._itemsSection.addAction('80%', () => log('activated'));
            this._itemsSection.addAction('60%', () => log('activated'));

            this.menu.addMenuItem(this._itemsSection);
    
            // Add an entry-point for more settings
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            const settingsItem = this.menu.addAction('More Settings',
                () => ExtensionUtils.openPrefs());
                
            // Ensure the settings are unavailable when the screen is locked
            settingsItem.visible = Main.sessionMode.allowSettings;
            this.menu._settingsActions[Extension.uuid] = settingsItem;
        }            
         
    });

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
        this._items = null;

        ExtensionUtils.initTranslations(uuid);
    }

    enable() {
        this._items = [];
        this._items.push(new DisplayScaleQuickMenuToggle());
        QuickSettingsMenu._addItems(this._items);
    }

    disable() {
        this._items.forEach(item => item.destroy());
        this._items = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
