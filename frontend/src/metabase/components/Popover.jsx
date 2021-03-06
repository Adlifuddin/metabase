/* eslint-disable react/prop-types */
import React, { Component } from "react";
import PropTypes from "prop-types";
import ReactDOM from "react-dom";
import SandboxedPortal from "metabase/components/SandboxedPortal";

import OnClickOutsideWrapper from "./OnClickOutsideWrapper";
import Tether from "tether";

import { constrainToScreen } from "metabase/lib/dom";

import cx from "classnames";

import "./Popover.css";

// space we should leave berween page edge and popover edge
const PAGE_PADDING = 10;
// Popover padding and border
const POPOVER_BODY_PADDING = 2;

export default class Popover extends Component {
  constructor(props, context) {
    super(props, context);

    this.state = {
      // some child components of indeterminate height (see AccordionList) require a maxHeight prop in order to avoid overflowing off of the page
      maxHeight: 0,
    };

    this._popoverElement = this._createPopoverElement();
    document.body.appendChild(this._popoverElement);
  }

  static propTypes = {
    id: PropTypes.string,
    isOpen: PropTypes.bool,
    hasArrow: PropTypes.bool,
    hasBackground: PropTypes.bool,
    // target: PropTypes.oneOfType([PropTypes.func, PropTypes.node]),
    tetherOptions: PropTypes.object,
    // used to prevent popovers from being taller than the screen
    sizeToFit: PropTypes.bool,
    pinInitialAttachment: PropTypes.bool,
    // most popovers have a max-width to prevent them from being overly wide
    // in the case their content is of an unexpected length
    // noMaxWidth allows that to be overridden in cases where popovers should
    // expand  alongside their contents contents
    autoWidth: PropTypes.bool,
    // prioritized vertical attachments points on the popover
    verticalAttachments: PropTypes.array,
    // prioritized horizontal attachment points on the popover
    horizontalAttachments: PropTypes.array,
    // by default we align the top edge of the target to the bottom edge of the
    // popover or vice versa. This causes the same edges to be aligned
    alignVerticalEdge: PropTypes.bool,
    // by default we align the popover to the center of the target. This
    // causes the edges to be aligned
    alignHorizontalEdge: PropTypes.bool,
    // don't wrap the popover in an OnClickOutsideWrapper
    noOnClickOutsideWrapper: PropTypes.bool,
  };

  static defaultProps = {
    isOpen: true,
    hasArrow: false,
    hasBackground: true,
    verticalAttachments: ["top", "bottom"],
    horizontalAttachments: ["left", "right"],
    alignVerticalEdge: false,
    alignHorizontalEdge: true,
    targetOffsetX: 0,
    targetOffsetY: 5,
    sizeToFit: false,
    autoWidth: false,
    noOnClickOutsideWrapper: false,
  };

  _createPopoverElement() {
    const el = document.createElement("div");
    el.className = "PopoverContainer";
    return el;
  }

  componentDidMount() {
    this._updateContainerClass();

    if (this.props.isOpen) {
      this._updateTetherOptions();
      this._updateMaxHeight();
    }
  }

  componentDidUpdate() {
    this._updateContainerClass();

    if (this.props.isOpen) {
      this._updateTetherOptions();
      this._updateMaxHeight();
    }
  }

  _updateMaxHeight() {
    const maxHeight = this._getMaxHeight();
    if (this.state.maxHeight !== maxHeight) {
      this.setState({
        maxHeight,
      });
    }
  }

  _updateContainerClass() {
    if (this.props.isOpen) {
      this._popoverElement.classList.add("PopoverContainer--open");
    } else {
      this._popoverElement.classList.remove("PopoverContainer--open");
    }
  }

  componentWillUnmount() {
    document.body.removeChild(this._popoverElement);
    this._tether && this._tether.destroy();
  }

  handleDismissal = (...args) => {
    if (this.props.onClose) {
      this.props.onClose(...args);
    }
  };

  _buildPopover() {
    const {
      id,
      hasBackground,
      autoWidth,
      hasArrow,
      className,
      style,
      children,
      noOnClickOutsideWrapper,
      dismissOnEscape,
      dismissOnClickOutside,
    } = this.props;
    const childProps = {
      maxHeight: this.state.maxHeight,
    };
    const popoverContent = (
      <div
        id={id}
        className={cx(
          "PopoverBody",
          {
            "PopoverBody--withBackground": hasBackground,
            "PopoverBody--withArrow": hasArrow && hasBackground,
            "PopoverBody--autoWidth": autoWidth,
          },
          // TODO kdoh 10/16/2017 we should eventually remove this
          className,
        )}
        style={style}
      >
        {typeof children === "function"
          ? children(childProps)
          : React.Children.count(children) === 1 &&
            // NOTE: workaround for https://github.com/facebook/react/issues/12136
            !Array.isArray(children)
          ? React.cloneElement(React.Children.only(children), childProps)
          : children}
      </div>
    );

    return noOnClickOutsideWrapper ? (
      popoverContent
    ) : (
      <OnClickOutsideWrapper
        handleDismissal={this.handleDismissal}
        dismissOnEscape={dismissOnEscape}
        dismissOnClickOutside={dismissOnClickOutside}
      >
        {popoverContent}
      </OnClickOutsideWrapper>
    );
  }

  _updateTetherOptions() {
    const tetherOptions = {
      element: this._popoverElement,
      target: this._getTargetElement(),
    };

    if (this.props.tetherOptions) {
      this._setTetherOptions({
        ...tetherOptions,
        ...this.props.tetherOptions,
      });
    } else {
      if (!this._best || !this.props.pinInitialAttachment) {
        let best = {
          attachmentX: "center",
          attachmentY: "top",
          targetAttachmentX: "center",
          targetAttachmentY: "bottom",
          offsetX: 0,
          offsetY: 0,
        };

        // horizontal
        best = this._getBestAttachmentOptions(
          tetherOptions,
          best,
          this.props.horizontalAttachments,
          ["left", "right"],
          (best, attachmentX) => ({
            ...best,
            attachmentX: attachmentX,
            targetAttachmentX: this.props.alignHorizontalEdge
              ? attachmentX
              : "center",
            offsetX: {
              center: 0,
              left: -this.props.targetOffsetX,
              right: this.props.targetOffsetX,
            }[attachmentX],
          }),
        );

        // vertical
        best = this._getBestAttachmentOptions(
          tetherOptions,
          best,
          this.props.verticalAttachments,
          ["top", "bottom"],
          (best, attachmentY) => ({
            ...best,
            attachmentY: attachmentY,
            targetAttachmentY: (this.props.alignVerticalEdge
            ? attachmentY === "bottom"
            : attachmentY === "top")
              ? "bottom"
              : "top",
            offsetY: {
              top: this.props.targetOffsetY,
              bottom: -this.props.targetOffsetY,
            }[attachmentY],
          }),
        );

        this._best = best;
      }
      if (this.props.sizeToFit) {
        const body = tetherOptions.element.querySelector(".PopoverBody");
        if (this._tether.attachment.top === "top") {
          if (constrainToScreen(body, "bottom", PAGE_PADDING)) {
            body.classList.add("scroll-y");
            body.classList.add("scroll-show");
          }
        } else if (this._tether.attachment.top === "bottom") {
          if (constrainToScreen(body, "top", PAGE_PADDING)) {
            body.classList.add("scroll-y");
            body.classList.add("scroll-show");
          }
        }
      }

      // finally set the best options
      this._setTetherOptions(tetherOptions, this._best);
    }
  }

  _setTetherOptions(tetherOptions, o) {
    if (o) {
      tetherOptions = {
        ...tetherOptions,
        attachment: `${o.attachmentY} ${o.attachmentX}`,
        targetAttachment: `${o.targetAttachmentY} ${o.targetAttachmentX}`,
        targetOffset: `${o.offsetY}px ${o.offsetX}px`,
      };
    }
    if (this._tether) {
      this._tether.setOptions(tetherOptions);
      // tether keeps a 3-member history.
      // it seems to mutate viewport and page settings
      // it keeps in its history to be wrong.
      // this creates an absolutely wild bug
      // that appears only if you click 4 times
      if (this._tether.history && this._tether.history.length > 0) {
        this._tether.history[0].page.top = this.props.targetOffsetY;
        this._tether.history[0].viewport.top = this.props.targetOffsetY;
      }
    } else {
      this._tether = new Tether(tetherOptions);
    }
  }

  _getMaxHeight() {
    const { top, bottom } = this._getTargetElement().getBoundingClientRect();

    let attachments;
    if (this.props.pinInitialAttachment && this._best) {
      // if we have a pinned attachment only use that
      attachments = [this._best.attachmentY];
    } else {
      // otherwise use the verticalAttachments prop
      attachments = this.props.verticalAttachments;
    }

    const availableHeights = attachments.map(attachmentY =>
      attachmentY === "top"
        ? window.innerHeight - bottom - this.props.targetOffsetY - PAGE_PADDING
        : attachmentY === "bottom"
        ? top - this.props.targetOffsetY - PAGE_PADDING
        : 0,
    );

    // get the largest available height, then subtract .PopoverBody's border and padding
    return Math.max(...availableHeights) - POPOVER_BODY_PADDING;
  }

  _getBestAttachmentOptions(
    tetherOptions,
    options,
    attachments,
    offscreenProps,
    getAttachmentOptions,
  ) {
    let best = { ...options };
    let bestOffScreen = -Infinity;
    // try each attachment until one is entirely on screen, or pick the least bad one
    for (const attachment of attachments) {
      // compute the options for this attachment position then set it
      const options = getAttachmentOptions(best, attachment);
      this._setTetherOptions(tetherOptions, options);

      // get bounds within *document*
      const elementRect = Tether.Utils.getBounds(tetherOptions.element);

      // get bounds within *window*
      const doc = document.documentElement;
      const left =
        (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
      const top = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);
      elementRect.top -= top;
      elementRect.bottom += top;
      elementRect.left -= left;
      elementRect.right += left;

      // test to see how much of the popover is off-screen
      const offScreen = offscreenProps
        .map(prop => Math.min(elementRect[prop], 0))
        .reduce((a, b) => a + b);
      // if none then we're done, otherwise check to see if it's the best option so far
      if (offScreen === 0) {
        best = options;
        break;
      } else if (offScreen > bestOffScreen) {
        best = options;
        bestOffScreen = offScreen;
      }
    }
    return best;
  }

  _getTargetElement() {
    let target;
    if (this.props.targetEvent) {
      // create a fake element at the event coordinates
      target = document.getElementById("popover-event-target");
      if (!target) {
        target = document.createElement("div");
        target.id = "popover-event-target";
        document.body.appendChild(target);
      }
      target.style.left = this.props.targetEvent.clientX - 3 + "px";
      target.style.top = this.props.targetEvent.clientY - 3 + "px";
    } else if (this.props.target) {
      if (typeof this.props.target === "function") {
        target = ReactDOM.findDOMNode(this.props.target());
      } else {
        target = ReactDOM.findDOMNode(this.props.target);
      }
    }
    if (target == null) {
      target = ReactDOM.findDOMNode(this).parentNode;
    }
    return target;
  }

  render() {
    return (
      <span className="hide">
        {this.props.isOpen ? (
          <SandboxedPortal container={this._popoverElement}>
            {this._buildPopover()}
          </SandboxedPortal>
        ) : null}
      </span>
    );
  }
}
