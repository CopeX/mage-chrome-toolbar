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

var port = chrome.runtime.connect({
  name: "devtools:" + chrome.devtools.inspectedWindow.tabId
});

function updateDevToolsInformation() {
  function onUpdateMessage() {
    return window.mspDevTools;
  }

  chrome.devtools.inspectedWindow.eval('(' + onUpdateMessage.toString() + ')()', {}, function (res) {
    var tabId = chrome.devtools.inspectedWindow.tabId;

    port.postMessage({
      tabId: tabId,
      type: 'update',
      to: 'panel',
      payload: res
    });
  });
}

chrome.devtools.panels.create(
  "Magento",
  null,
  "panel/panel.html",
  null
);

var magentoSidebarPane = null;

chrome.devtools.panels.elements.createSidebarPane(
  "Magento",
  function (sidebar) {
    magentoSidebarPane = sidebar;
    sidebar.setPage('inspector.html');
  }
);

// Handle element selection changes and update the sidebar
chrome.devtools.panels.elements.onSelectionChanged.addListener(function () {
  updateInspectorSidebar();
});

function updateInspectorSidebar() {
  if (!magentoSidebarPane) {
    return;
  }

  function onSelectionChange(el) {
    if (!window.mspDevTools || !window.mspDevTools.hasOwnProperty('blocks')) {
      return { status: 'no-data' };
    }

    // Locate nearest parent with msp devtools info
    var fetchAttr = function (node, attr) {
      while (node) {
        try {
          var attrValue = node.getAttribute(attr);
          if (attrValue) {
            return attrValue;
          }
        } catch (e) {
        }
        node = node.parentNode;
      }
    };

    // UI Component search
    var uiBlockId = fetchAttr(el, 'data-mspdevtools-ui');
    if (uiBlockId) {
      if (!window.mspDevTools['uiComponents'].hasOwnProperty(uiBlockId)) {
        return { status: 'missing' };
      }
      if (window.mspDevTools['uiComponents'][uiBlockId]) {
        return { status: 'found', data: window.mspDevTools['uiComponents'][uiBlockId] };
      }
    }

    // Block search
    var blockId = fetchAttr(el, 'data-mspdevtools');
    if (blockId) {
      if (!window.mspDevTools['blocks'].hasOwnProperty(blockId)) {
        return { status: 'missing' };
      }
      if (window.mspDevTools['blocks'][blockId]) {
        return { status: 'found', data: window.mspDevTools['blocks'][blockId] };
      }
    }

    return { status: 'empty' };
  }

  chrome.devtools.inspectedWindow.eval('(' + onSelectionChange.toString() + ')($0)', {}, function (result) {
    if (!result) {
      return;
    }

    // Use setExpression to update the sidebar with the inspection result
    // This will trigger the inspector.html page to update via window.mspInspectorData
    var expression = 'window.mspInspectorData = ' + JSON.stringify(result) + '; window.mspInspectorData;';
    magentoSidebarPane.setExpression(expression);
  });
}

port.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.tabId === chrome.devtools.inspectedWindow.tabId) {
    if (msg.type === 'update') {
      updateDevToolsInformation();
      // Also update the inspector sidebar when data updates
      updateInspectorSidebar();
    }
  }
});

updateDevToolsInformation();
// Initial inspector update
updateInspectorSidebar();