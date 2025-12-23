import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { GrafanaTheme2} from '@grafana/data';
import { Popover, useStyles2 } from '@grafana/ui';
import { css, cx } from '@emotion/css';


export type TooltipTriggerConfig = {
  x: number;
  y: number;
  maxWidth?: number;
  maxHeight?: number;
}

type TooltipTriggerInternalConfig = TooltipTriggerConfig & {
  container: { width: number, height: number};
  overlayRect: DOMRect;
}

function getPosition(config: TooltipTriggerInternalConfig) {
    const mouseX = config.x, mouseY = config.y;
    let vPos = 'middle', hPos='right';
    const paddingLeft = 20, paddingTop = 20;

    // let left = (mouseX - config.overlayRect.x) ;
    let top = mouseY - ( config.container.height / 2 );
    let left = mouseX - ( config.container.width / 2 ) ;
    
    // console.log('TooltipTrigger.getPosition(): config', config, 'left:', left, 'top:', top)
    // console.log('TooltipTrigger.getPosition(): overlay.right', config.overlayRect.right, 'container.w/2', config.container.width / 2, 'mx', mouseX, 'left:', left, 'top:', top)
    
    if (top < config.overlayRect.top ) {
        vPos='top';
    }
    else if ( mouseY + config.container.height / 2 > config.overlayRect.bottom ) {
        vPos= 'bottom';
    }
    if ( left < config.overlayRect.left ) {
        hPos = 'right';
    }
    else if ( mouseX + paddingLeft + config.container.width > config.overlayRect.right ) {
        hPos='left';
        if (  mouseX + config.container.width / 2 < config.overlayRect.right ) {
            hPos = 'middle';
            // have to force popup above(bottom) or below (top) the cursor; choose below by default
            vPos = 'top';
            if (top < config.overlayRect.top ) {
                vPos='top';
            }
            else if ( mouseY + config.container.height / 2 > config.overlayRect.bottom ) {
                vPos= 'bottom';
            }
        }
    }
    console.log('TooltipTrigger.getPosition(): vPos', vPos, 'hPos', hPos)
    // if ( vPos === 'top' ) {
    switch ( vPos ) {
        case 'top':
            top = mouseY + paddingTop ;
            if(hPos === 'right') {
                hPos = 'middle';
            }
            break;
        case 'bottom':
            top = mouseY - ( config.container.height + paddingTop );
            if(hPos === 'right') {
                hPos = 'middle';
            }
            break;
        case 'middle':
            // this is the default value... to set again.
            // top = mouseY - ( config.container.height / 2 );
            break;
    }

    switch(hPos) {
        case 'left':
            left = mouseX - ( config.container.width + paddingLeft );
            break;
        case 'right':
            left = mouseX + paddingLeft;
            break;
        case 'middle':
            left = mouseX - ( config.container.width / 2 ) ;
            if (left < config.overlayRect.left) {
                left = mouseX + paddingLeft;
            } else if (left > config.overlayRect.right) {
                left = mouseX - ( config.container.width + paddingLeft );
            }
            // console.log('TooltipTrigger.getPosition(): left', left, 'config', config)
            break;
    }

    return [left, top];
}

export interface TooltipTriggerProps {
    content: React.JSX.Element | string | undefined;
    config: TooltipTriggerConfig | null;
    open: boolean | undefined;

    registerSetterSetTooltipContent: any
    // registerSetterSetTooltipContent: (
    //     (setter: React.JSX.Element | string) => void
    // ) => void;

    registerSetterSetTooltipOpen: (
        setter: React.Dispatch<React.SetStateAction<boolean>>
    ) => void;

    registerSetterSetTooltipConfig: (
        setter: React.Dispatch<React.SetStateAction<TooltipTriggerConfig>>
    ) => void;
    // onRefsChange?: ( refs: {
    //     content: React.JSX.Element | string;
    //     config: TooltipTriggerConfig;
    // }) => void;
}

export type TooltipTriggerHandle = {
    // setContainerDim: (w: number, h: number) => void;
    setOverlayRect: (rect: DOMRect) => void;
    setMousePosition: ( mouseX: number, mouseY: number) => void,
    getTooltipContentRef: () => React.JSX.Element | string;
    // getTooltipConfigRef: () => TooltipTriggerConfig;
}

export const TooltipTrigger = forwardRef<TooltipTriggerHandle, TooltipTriggerProps>((props, ref) => {
    const [tooltipContent, setTooltipContent] = useState<React.JSX.Element | string>(props.content || 'Default Value');
    const [tooltipOpen, setTooltipOpen] = useState<boolean>(props.open || false);
    const [tooltipConfig, setTooltipConfig ] = useState<TooltipTriggerConfig>(props.config || {
        x: 0,
        y: 0,
    });


    const tooltipContentRef = useRef<string | React.JSX.Element>('Default Value');
    const tooltipConfigRef = useRef<TooltipTriggerInternalConfig>({ 
            x: props.config?.x || 0, 
            y: props.config?.y || 0,
            container: { width: 0, height: 0},
            overlayRect: new DOMRect(0, 0, 0, 0),
        });

  const tooltipContainerRef = useRef<HTMLDivElement | null>(null);

    // Expose setters to parent
    const registerSetterSetTooltipContent = props.registerSetterSetTooltipContent;

    useEffect( () => {
        registerSetterSetTooltipContent( setTooltipContentWrapper() );
    }, [registerSetterSetTooltipContent] );

    const registerSetterSetTooltipOpen = props.registerSetterSetTooltipOpen;
    useEffect( () => {
        registerSetterSetTooltipOpen( setTooltipOpen );
    }, [registerSetterSetTooltipOpen] );

    const registerSetterSetTooltipConfig = props.registerSetterSetTooltipConfig;
    useEffect( () => {
        registerSetterSetTooltipConfig( setTooltipConfig );
    }, [registerSetterSetTooltipConfig] );


    function setTooltipContentWrapper( ){
        return function( content: React.JSX.Element | string) {
            // console.log("setTooltipContentWrapper: ici - typeof content: ", typeof content)
            if (typeof content === "string") {
                setTooltipContent( <div ref={tooltipContainerRef} dangerouslySetInnerHTML={{__html: content}}/> );
            } else {
                setTooltipContent( <div ref={tooltipContainerRef}>{content}</div> );
            }
        }
    }

    // set config and content ref
    tooltipContentRef.current =
        typeof tooltipContent === 'object'
            ? tooltipContent.props?.dangerouslySetInnerHTML?.__html ?? ''
            : tooltipContent;

    useImperativeHandle(ref, () => ({

        setOverlayRect(rect: DOMRect) {
            if (tooltipConfigRef.current) {
                tooltipConfigRef.current.overlayRect = rect;
                // console.log('TooltipTrigger()/setOverlayRect: rect', rect);
            }
        },
        setMousePosition( mouseX: number, mouseY: number) {
            if (tooltipConfigRef.current) {
                tooltipConfigRef.current.x = mouseX;
                tooltipConfigRef.current.y = mouseY;
                // console.log('TooltipTrigger()/setMousePosition(): (x,y)', [mouseX, mouseY]);
                const [left, top] = getPosition(tooltipConfigRef.current);
                const config:TooltipTriggerConfig = { 
                    x: left,
                    y: top,
                }
                setTooltipConfig(config)
                setTooltipOpen(true);
            }

        },
        getTooltipContentRef() {
            return tooltipContentRef?.current;
        },
    }));

    useEffect( () => {
        if (!tooltipConfigRef.current) {
            return;
        }
        tooltipConfigRef.current.x = tooltipConfig.x;
        tooltipConfigRef.current.y = tooltipConfig.y;
        // console.log('TooltipTrigger(/useEffect(tooltipConfig)): src tooltipConfig:', tooltipConfig, 'dst tooltipConfigRef', tooltipConfigRef.current)
    }, [tooltipConfig]);

    // useEffect( () => {
    //     if (tooltipOpen && tooltipContainerRef && tooltipContainerRef.current) {

    //         // console.log('TooltipTrigger.useEffect(/tooltipOpen): setContainerDim candidate:', tooltipContainerRef.current);
    //         const containerRect = tooltipContainerRef.current.getBoundingClientRect() ?? new DOMRect(0, 0, 0, 0);
    //         if (tooltipConfigRef.current) {
    //             tooltipConfigRef.current.container.width = containerRect.width;
    //             tooltipConfigRef.current.container.height = containerRect.height;
    //             console.log('TooltipTrigger.useEffect(/tooltipOpen): setContainerDim (w,h):', [containerRect.width, containerRect.height]);
    //         }

    //     }
    // }, [tooltipOpen, tooltipContent]);

    useEffect( () => {
        if (tooltipOpen && tooltipContainerRef && tooltipContainerRef.current) {

            // console.log('TooltipTrigger.useEffect(/tooltipOpen): setContainerDim candidate:', tooltipContainerRef.current);
            const containerRect = tooltipContainerRef.current.getBoundingClientRect() ?? new DOMRect(0, 0, 0, 0);
            if (tooltipConfigRef.current) {
                tooltipConfigRef.current.container.width = containerRect.width;
                tooltipConfigRef.current.container.height = containerRect.height;
//                console.log('TooltipTrigger.useEffect(/tooltipOpen): setContainerDim (w,h):', [containerRect.width, containerRect.height]);
            }

        }
    }, [tooltipOpen, tooltipContainerRef.current]);

    //------
    
    const styles = useStyles2(getStyles);

    let content;
    if (typeof tooltipContent !== "string") {
        // console.log("build TooltipTrigger(): tooltipConfig", tooltipConfig)
        content = (
            <div ref={tooltipContainerRef}
                className={cx(
                    styles.wrapper,
                    css`
                    max-width: ${props.config?.maxWidth ? props.config.maxWidth + 'px' : '800px'};
                    max-height: ${props.config?.maxHeight ? props.config.maxHeight + 'px' : '600px'};
                    overflow: auto;
                    `
                    )}>
                {tooltipContent}
            </div>
        );
    } else {
        content = <div
            className={cx(
                styles.wrapper,
                css`
                    max-width: ${props.config?.maxWidth ? props.config.maxWidth + 'px' : '800px'};
                    max-height: ${props.config?.maxHeight ? props.config.maxHeight + 'px' : '600px'};
                    overflow: auto;
                    `
                )}
            ref={tooltipContainerRef}
            dangerouslySetInnerHTML={{__html: tooltipContent}}
        />
    }

    return (
        <Popover
            show={tooltipOpen}
            referenceElement={{
                getBoundingClientRect: () => new DOMRect(tooltipConfig.x, tooltipConfig.y, 0, 0),
            }}
            content={content}
        />
    );
});

const getStyles = (theme: GrafanaTheme2) => {
    return {
        wrapper: css({
            background: theme.components.tooltip.background,
            border: `1px solid ${theme.colors.border.weak}`, 
            borderRadius: theme.shape.radius.default,
            boxShadow: theme.shadows.z2,
            fontSize: theme.typography.bodySmall.fontSize,
            left: 0,
            top: 0,
            maxWidth: '800px',
            maxHeight: '600px',
            overflow: 'auto',
            padding: theme.spacing(1),
            position: 'fixed',
            userSelect: 'text',
            whiteSpace: 'pre',
            zIndex: theme.zIndex.tooltip,
        }),
 
    };
};

TooltipTrigger.displayName = 'TooltipTrigger';
