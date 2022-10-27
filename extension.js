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
const { GObject, Gio, GLib } = imports.gi; 

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const QuickSettings = imports.ui.quickSettings;
const QuickSettingsMenu = imports.ui.main.panel.statusArea.quickSettings;

const ByteArray = imports.byteArray; 
const threshold_command = "pkexec tee /sys/class/power_supply/BAT0/charge_control_end_threshold" //new

const Domain = Gettext.domain(Me.metadata.uuid);
const _ = Domain.gettext;

//const DisplayBackend = Me.imports.dbus;

//const LAST_SCALE_KEY = 'last-selected-display-scale';

// Round scale values to multiple of 25 % just like Gnome Settings
//function scaleToPercentage(scale) {
//    return Math.floor(scale * 4 + 0.5) * 25;
//}

const BatteryThresholdQuickMenuToggle = GObject.registerClass(
    class BatteryThresholdQuickMenuToggle extends QuickSettings.QuickMenuToggle {

        _init() {
            // Set QuickMenu name and icon
            super._init({
                label: _('Batt threshold'),
                iconName: 'battery-level-100-discharged-symbolic',
                toggleMode: true,
            });
            

            this.get_threshold(); 
            let labelText = `Battery threshold: ${this.threshold}%`;

            // This function is unique to this class. It adds a nice header with an
            // icon, title and optional subtitle. It's recommended you do so for
            // consistency with other menus.
            this.menu.setHeader(`battery-level-${this.threshold}-discharged-symbolic`, 'Battery threshold',
                labelText);
            
    
            // You may also add sections of items to the menu
            this._itemsSection = new PopupMenu.PopupMenuSection();
            this._itemsSection.addAction('100%', () => this.set_threshold("100"));
            this._itemsSection.addAction('80%', () => {this.set_threshold("80"), this.checked = true}); //selected marked checked activate activated
            this._itemsSection.addAction('60%', () => {this.set_threshold("60"), this.checked = true});

            this.menu.addMenuItem(this._itemsSection);

            this.connect('clicked', () => this._toggle());
        }
        
        _toggle() {
            if (this.checked) {
                this.set_threshold("80");
            } else {
                this.set_threshold("100");
            }
        }
        
        get_threshold() {
            let [, out, ,] = GLib.spawn_command_line_sync("cat /sys/class/power_supply/BAT0/charge_control_end_threshold");
            this.threshold = (ByteArray.toString(out)).trim();
        }
        
        set_threshold(new_threshold) {
            if (new_threshold !== this.threshold) {
                try {
                    let proc = Gio.Subprocess.new(
                        ['/bin/bash', '-c', `echo ${new_threshold} | ${threshold_command}`],
                        Gio.SubprocessFlags.STDERR_PIPE
                    );
                    proc.communicate_utf8_async(null, null, (proc, res) => {
                        try {
                            let [, , stderr] = proc.communicate_utf8_finish(res);
                            if (!proc.get_successful())
                                throw new Error(stderr);

                            this.get_threshold()
                            if (this.threshold == new_threshold) {
                                Main.notify(_(`Battery threshold set to ${this.threshold}%`));
                                this.menu.setHeader(`battery-level-${this.threshold}-discharged-symbolic`, 'Battery threshold', `Battery threshold: ${this.threshold}%`);
                                //this.label = "txt"
                                this.iconName = `battery-level-${this.threshold}-discharged-symbolic`
                            }
                        } catch (e) {
                            logError(e);
                        }
                    });
                } catch (e) {
                    logError(e);
                }
            }
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
        this._items.push(new BatteryThresholdQuickMenuToggle());
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
