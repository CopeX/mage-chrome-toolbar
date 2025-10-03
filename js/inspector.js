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

function updateInspectorUI(result) {
  $('#inspected').css('display', 'none');
  $('#missing').css('display', 'none');
  $('#no-data').css('display', 'none');

  if (!result || result.status === 'no-data') {
    $('#no-data').css('display', 'block');
  } else if (result.status === 'missing') {
    $('#missing').css('display', 'block');
  } else if (result.status === 'found' && result.data) {
    $('#inspected').css('display', 'block');
    $('#inspected').html(getBlockInfo(result.data));
    $('.phpstorm-link').click(function(e) {
      e.preventDefault();
      fetch(e.target.href);
    });
  } else {
    // Empty or no data
    $('#no-data').css('display', 'block');
  }
}

function onItemInspected() {
  // Check if we have chrome.devtools.inspectedWindow available
  if (!chrome || !chrome.devtools || !chrome.devtools.inspectedWindow) {
    console.warn('chrome.devtools.inspectedWindow not available');
    return;
  }

  function onSelectionChange(el) {
    if (!window.mspDevTools || !window.mspDevTools.hasOwnProperty('blocks')) {
      return 'no-data';
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

    // Block search
    var uiBlockId = fetchAttr(el, 'data-mspdevtools-ui');
    if (uiBlockId) {
      if (!window.mspDevTools['uiComponents'].hasOwnProperty(uiBlockId)) {
        return 'missing';
      }

      if (window.mspDevTools['uiComponents'][uiBlockId]) {
        return window.mspDevTools['uiComponents'][uiBlockId];
      }
    }

    // Block search
    var blockId = fetchAttr(el, 'data-mspdevtools');
    if (blockId) {
      if (!window.mspDevTools['blocks'].hasOwnProperty(blockId)) {
        return 'missing';
      }

      if (window.mspDevTools['blocks'][blockId]) {
        return window.mspDevTools['blocks'][blockId];
      }
    }

    return {};
  }

  chrome.devtools.inspectedWindow.eval('(' + onSelectionChange.toString() + ')($0)', {}, function (res) {
    // Convert old format to new format for compatibility
    var result;
    if (res === 'no-data') {
      result = { status: 'no-data' };
    } else if (res === 'missing') {
      result = { status: 'missing' };
    } else if (res && typeof res === 'object' && Object.keys(res).length > 0) {
      result = { status: 'found', data: res };
    } else {
      result = { status: 'no-data' };
    }

    updateInspectorUI(result);
  });
}

// Listen for updates from devtools.js via window.mspInspectorData
// This is set by devtools.js using setExpression when the selection changes
var lastInspectorData = null;

function checkForInspectorDataUpdates() {
  if (window.mspInspectorData && window.mspInspectorData !== lastInspectorData) {
    lastInspectorData = window.mspInspectorData;
    updateInspectorUI(window.mspInspectorData);
  }
}

// Poll for updates (setExpression updates window.mspInspectorData)
setInterval(checkForInspectorDataUpdates, 100);

// Also try the old approach if chrome.devtools.panels.elements is available
// (for backwards compatibility or if running in a different context)
if (chrome && chrome.devtools && chrome.devtools.panels && chrome.devtools.panels.elements && chrome.devtools.panels.elements.onSelectionChanged) {
  chrome.devtools.panels.elements.onSelectionChanged.addListener(function () {
    onItemInspected();
  });

  onItemInspected();
} else {
  // Initial display
  $('#no-data').css('display', 'block');
}
