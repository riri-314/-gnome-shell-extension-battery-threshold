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

const BatteryThresholdQuickMenuToggle = GObject.registerClass(
    class BatteryThresholdQuickMenuToggle extends QuickSettings.QuickMenuToggle {

        _init() {
            this.get_threshold(); 
            // Set QuickMenu name and icon
            super._init({
                title: _('Threshold'),
                iconName: `battery-level-${this.threshold}-discharged-symbolic`,
                toggleMode: true,
                subtitle: this.threshold + "%",
            });
            

            //this.get_threshold(); 
            let labelText = `Battery threshold: ${this.threshold}%`;

            if (this.threshold !== "100") {
                this.checked = true
            } else {
                this.checked = false
            }

            // This function is unique to this class. It adds a nice header with an
            // icon, title and optional subtitle. It's recommended you do so for
            // consistency with other menus.
            this.menu.setHeader(`battery-level-${this.threshold}-discharged-symbolic`, 'Battery threshold',
                labelText);
            
    
            // You may also add sections of items to the menu
            this._itemsSection = new PopupMenu.PopupMenuSection();
            this._itemsSection.addAction('100%', () => this.set_threshold("100"));
            this._itemsSection.addAction('80%', () => {this.set_threshold("80")}); //selected marked checked activate activated
            this._itemsSection.addAction('60%', () => {this.set_threshold("60")}); //, this.checked = true

            this.menu.addMenuItem(this._itemsSection);
            
            this.connect('clicked', () => this._toggle());
        }
        
        _toggle() {
            if (this.threshold == "100") {
                this.set_threshold("80");
                if (this.threshold == "80") {
                } else {
                    this.checked = false
                }
            } else {
                this.set_threshold("100");
                if (this.threshold !== "100") {
                    this.checked = true;
                }
            }
        }
        _sync() {
            if (this.threshold !== "100") {
                this.checked = true
                this.subtitle = this.threshold + "%";
            } else {
                this.checked = false
                this.subtitle = this.threshold + "%";
                //this.iconName = `battery-level-${this.threshold}-discharged-symbolic`
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
                                this.checked = true
                                if (this.threshold == new_threshold) {
                                Main.notify(_(`Battery threshold set to ${this.threshold}%`));
                                this.menu.setHeader(`battery-level-${this.threshold}-discharged-symbolic`, 'Battery threshold', `Battery threshold: ${this.threshold}%`);
                                this.subtitle = this.threshold + "%";
                                //change item section title here
                                
                                //this.label = "txt"
                                this.iconName = `battery-level-${this.threshold}-discharged-symbolic`
                                //this.set({checked})
                                if (new_threshold == "100") {
                                    this.checked = false
                                } else {
                                    this.checked = true
                                }
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
