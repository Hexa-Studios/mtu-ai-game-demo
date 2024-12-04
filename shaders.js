// Grid shader for TRON-style effect
const GridShader = {
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec2 vUv;
        uniform vec3 color;
        uniform float gridSize;
        uniform float lineWidth;
        uniform float glowStrength;
        uniform bool isSky;

        void main() {
            vec2 grid = abs(fract(vUv * gridSize - 0.5) - 0.5) / fwidth(vUv * gridSize);
            float line = min(grid.x, grid.y);
            float glow = 1.0 - min(line, 1.0);
            
            // Adjust alpha for sky grid
            float alpha = isSky ? 0.3 : 1.0;
            
            vec3 glowColor = color * (1.0 + glow * glowStrength);
            gl_FragColor = vec4(glowColor, smoothstep(lineWidth, 0.0, line) * alpha);
        }
    `
};

// Color correction shader
const ColorShader = {
    uniforms: {
        tDiffuse: { value: null },
        brightness: { value: 0.0 },
        contrast: { value: 1.0 },
        saturation: { value: 1.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float brightness;
        uniform float contrast;
        uniform float saturation;
        varying vec2 vUv;

        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            
            // Apply brightness
            color.rgb += brightness;
            
            // Apply contrast
            color.rgb = (color.rgb - 0.5) * contrast + 0.5;
            
            // Apply saturation
            float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
            color.rgb = mix(vec3(gray), color.rgb, saturation);
            
            gl_FragColor = color;
        }
    `
};
