/**
 * MageSpecialist
 *
 * NOTICE OF LICENSE
 *
 * This source file is subject to the Open Software License (OSL 3.0)
 * that is bundled with this package in the file LICENSE.txt.
 * It is also available through the world-wide-web at this URL:
 * http://opensource.org/licenses/osl-3.0.php
 * If you did not receive a copy of the license and are unable to
 * obtain it through the world-wide-web, please send an email
 * to info@magespecialist.it so we can send you a copy immediately.
 *
 * @category   MSP
 * @package    MSP_DevTools
 * @copyright  Copyright (c) 2017 Skeeller srl (http://www.magespecialist.it)
 * @license    http://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */

var mspPorts = {};

chrome.runtime.onConnect.addListener(function (port) {
  var portName = port.name;
  var tabId = 0;

  if (portName.indexOf(':') === -1) {
    if (port.sender.tab && port.sender.tab.id) {
      tabId = port.sender.tab.id;
    }

    portName = portName + ':' + tabId;
  }

  console.log("Connected: " + portName);

  mspPorts[portName] = port;

  // Message forwarding
  port.onMessage.addListener(function (msg, sender, sendResponse) {
    if (!msg.tabId && sender.sender.tab) {
      msg.tabId = sender.sender.tab.id;
    }

    if (!msg.tabId) {
      msg.tabId = 0;
    }

    if (msg.to === 'background') {
      console.log("Message for " + msg.to + "(" + msg.tabId + "): " + msg.type);

      if (msg.type === 'icon') {
        console.log("Icon: " + msg.payload);

        if (msg.payload === 'online') {
          chrome.action.setIcon({path: "images/icon.png", tabId: msg.tabId});
        } else {
          chrome.action.setIcon({path: "images/icon_off.png", tabId: msg.tabId});
        }
      }

    } else {
      // Forward message
      sendMessage(msg);
    }
  });

  port.onDisconnect.addListener(function () {
    console.log("Disconnected: " + portName);
    // Clean up the port reference
    delete mspPorts[portName];

    // Check for runtime errors and log them
    if (chrome.runtime.lastError) {
      console.log("Port disconnect error: " + chrome.runtime.lastError.message);
    }
  });
});

function sendMessage(msg) {
  var portName = msg.to + ':' + msg.tabId;

  console.log("Message for " + msg.to + "(" + msg.tabId + "): " + msg.type);

  if (mspPorts[portName]) {
    try {
      mspPorts[portName].postMessage(msg);
      // Check for runtime errors after sending
      if (chrome.runtime.lastError) {
        console.log("Port disconnected: " + chrome.runtime.lastError.message);
        // Clean up the disconnected port
        mspPorts[portName] = null;
      }
    } catch (error) {
      console.log("Error sending message to " + portName + ": " + error.message);
      // Clean up the disconnected port
      mspPorts[portName] = null;
    }
  } else {
    console.log(msg.to + " is not defined");
  }
}
