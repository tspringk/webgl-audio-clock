/*!
 * Audio Clock for WebGL Assignment
 *
 * Copyright 2017 Takayasu Beharu
 * Released under the MIT license
 * http://jquery.org/license
 * Date: 2017-05-19
 */

'use strict';

var WebGLMyApps = WebGLMyApps || {};
WebGLMyApps.Module = WebGLMyApps.Module || {};
WebGLMyApps.Module.View = WebGLMyApps.Module.View || {};
WebGLMyApps.Module.Utils = WebGLMyApps.Module.Utils || {};

(() =>
{
  class App
  {
    constructor()
    {
      this.threejsViewController = null;
      this.threejsProps = {};
      this.actorsController = null;
      this.audioController = null;
      this.timerController = null;
      this.infomationController = null;

      document.addEventListener('DOMContentLoaded', e => this.onLoad(e) );
      document.addEventListener('keydown', e => this.onKeyDown(e) );
      document.addEventListener('touchstart', e => this.onTouchStart(e) );
      window.addEventListener('resize', e => this.onResize(e) );
    }

    init()
    {
      this.threejsProps = this.threejsViewController.init();
      this.actorsController = this.threejsProps.actors;

      this.update();
    }
    
    update()
    {
      let _props = {
        level: this.audioController.update(),
        time: this.timerController.getCurrentTime()
      };

      this.threejsViewController.update(_props);
      this.infomationController.update(_props)

      this.render();
    }

    render()
    {
      this.threejsViewController.render();

      requestAnimationFrame(this.update.bind(this));
    }

    onLoad(e)
    {
      this.audioController = new WebGLMyApps.Module.Utils.AudioController();
      this.infomationController = new WebGLMyApps.Module.OverlayInformationViewController();

      this.audioController.init(()=>
      {
        this.audioController.addMusicChangedEvent(this.infomationController, this.infomationController.onMusicChangedHandler);
        this.threejsViewController = WebGLMyApps.Module.ThreejsViewController.getInstance();
        this.timerController = new WebGLMyApps.Module.Utils.TimerController();
        this.init();
      });
    }

    onResize(e)
    {
      this.threejsViewController.onResize(e);
    }

    onKeyDown(e)
    {
      this.threejsViewController.onKeyDown(e);
      this.actorsController.onKeyDown(e);
      this.audioController.onKeyDown(e);
    }

    onTouchStart(e)
    {
      e.keyCode = 32;
      this.audioController.onKeyDown(e);
    }
  }  

  return new App();

})();

/*
* ModuleBase
*/

WebGLMyApps.Module.ModuleBase = (()=>
{
  return class ModuleBase
  {
    constructor(){
      this.view = null;
    }
    init(){}
    update(){}
    render(){}
    getView(){
      return this.view;
    }
    onResize(e){}
    onLoad(e){}
    onKeyDown(e){}
  }
})();

/*
* ThreejsViewController
*/

WebGLMyApps.Module.ThreejsViewController = (()=>
{
  let _instance = null;
  let _symbol = Symbol();

  return class ThreejsViewController extends WebGLMyApps.Module.ModuleBase
  {
    constructor(target)
    {
      super();

      if ( _symbol !== target || _instance !== null ) {
        throw new Error('You can get this instance by using getInstance()');
      }
        
      this.run = true;

      this.viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        targetDOM: document.getElementById('webgl')
      };
      
      this.props = {
        actors: null,
        scene: null,
        camera: null,
        controls: null,
        renderer: null,
        geometry: null,
        material: null,
        directional: null,
        ambient: null
      }

      this.params = {
        CAMERA_PARAMETER: {
          fovy: 60,
          aspect: this.viewport.width / this.viewport.height,
          near: 0.1,
          far: 800.0,
          x: 0.0,
          y: 10.0,
          z: 70.0,
          lookAt: new THREE.Vector3(0.0, 0.0, 0.0)
        },
        RENDERER_PARAMETER: {
          clearColor: 0x000000,
          width: this.viewport.width,
          height: this.viewport.height
        }
      };

      _instance = this;
      return _instance;    
    }

    static getInstance()
    {
      if ( _instance === null ) {
        _instance = new ThreejsViewController(_symbol);
      }
      return _instance
    }

    init()
    {
      let { actors, scene, camera, controls, renderer, geometry, material, directional, ambient } = this.props;
      const { CAMERA_PARAMETER, RENDERER_PARAMETER } = this.params;
            
      scene = new THREE.Scene();

      // initialize camera
      camera = new THREE.PerspectiveCamera(
        CAMERA_PARAMETER.fovy,
        CAMERA_PARAMETER.aspect,
        CAMERA_PARAMETER.near,
        CAMERA_PARAMETER.far
      );
      camera.position.x = CAMERA_PARAMETER.x;
      camera.position.y = CAMERA_PARAMETER.y;
      camera.position.z = CAMERA_PARAMETER.z;
      camera.lookAt(CAMERA_PARAMETER.lookAt);

      // initialize renderer
      renderer = new THREE.WebGLRenderer();
      renderer.setClearColor(new THREE.Color(RENDERER_PARAMETER.clearColor));
      renderer.setSize(RENDERER_PARAMETER.width, RENDERER_PARAMETER.height);
      this.viewport.targetDOM.appendChild(renderer.domElement);

      controls = new THREE.OrbitControls(camera, renderer.domElement);

      actors = new WebGLMyApps.Module.ActorsController();
      actors.init(scene);

      // initialize light
      directional = new THREE.DirectionalLight(0xffffff);
      ambient = new THREE.AmbientLight(0xffffff, 0.2);
      scene.add(directional);
      scene.add(ambient);

      this.props = { actors, scene, camera, controls, renderer, geometry, material, directional, ambient };

      return this.props;
    }

    update(_props)
    {
      if(!this.run){ return; }

      this.props.actors.update(_props);
    }

    render()
    {
      const { scene, camera, renderer } = this.props;
      
      renderer.render(scene, camera);
    }

    onResize(e)
    {
      this.viewport = Object.assign({}, this.viewport, {
        width: window.innerWidth,
        height: window.innerHeight
      });      
      this.props.renderer.setSize(this.viewport.width, this.viewport.height, true);
    }

    onKeyDown(e)
    {
      this.run = e.keyCode === 27 ? !this.run : this.run;
    }
  }
})();

/*
* ActorsController
*/

WebGLMyApps.Module.ActorsController = (()=>
{
  return class ActorsController extends WebGLMyApps.Module.ModuleBase
  {
    constructor()
    {
      super();

      this.scene = null;
      this.actorTimer = null;
      this.actors = [];
      this.initial = {
        MiscellaneousAmount: 30,
        MiscellaneousAmountLimit: 50
      };
    }

    init(_scene)
    {
      let { actors } = this;
      let _amount = 0;

      this.scene = _scene;
      this.actorTimer = new WebGLMyApps.Module.View.TimerView();
      this.actorTimer.init();
      this.scene.add(this.actorTimer.getView());  

      while(_amount++ < this.initial.MiscellaneousAmount)
      {
        setTimeout(()=>{
          this.addActor();
        }, 2000 + (_amount + 1) * 1000);
      }
    }

    addActor()
    {
      if(this.actors.length >= this.initial.MiscellaneousAmountLimit){ return; }

      const _actor = new WebGLMyApps.Module.View.MiscellaneousView()
      _actor.init();
      this.actors.push(_actor);
      this.scene.add(_actor.getView());      
    }
    
    removeActor()
    {
      if(this.actors.length < 1){ return; }

      const _actor = this.actors[0];
      this.scene.remove(_actor.getView());
      _actor.destroy();
      this.actors.shift();
    }

    update(_props)
    {
      this.actorTimer.update(_props);
      this.actors.forEach(_actor => _actor.update(_props) );
    }

    onKeyDown(e)
    {
      if(e.keyCode === 65)
      {
        this.addActor();
      }
      if(e.keyCode === 68)
      {
        this.removeActor();
      }
    }
  }
})();

/*
* ThreejsActorsViewBase
*/

WebGLMyApps.Module.View.ThreejsActorsViewBase = (()=>
{
  return class ThreejsViewBase extends WebGLMyApps.Module.ModuleBase
  {
    constructor()
    {
      super();

      this.enable = true;
      this.lifeTime = {
        current: 0,
        limit: 360
      };
      this.acceleration = 1;
      this.transform = {
        position: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Vector3(0, 0, 0),
        scale: new THREE.Vector3(1, 1, 1)
      };
      this.transformDefault = {};

      this.view = null;
      this.geometry = null;
      this.material = null;
      this.texture = null;
    }

    init()
    {
      super.init();

      this.transformDefault = Object.assign({}, this.transform);
    }
    
    getRandomRange(_min = 0, _max = 1)
    {
      return _min + Math.random() * (Math.abs(_min) + _max);
    }

    update(_props)
    {
      super.update(_props);
      
      const { position, rotation, scale } = this.transform;

      this.updateMotion(_props, position, rotation, scale);
      this.lifeTime.current = ++this.lifeTime.current > this.lifeTime.limit ? 0 : this.lifeTime.current;
    }

    updateMotion(_props, position, rotation, scale)
    {
      const _level = _props.level / 1000;
      const _velocity = {
        position: new THREE.Vector3(
          Math.sin(this.lifeTime.current * this.acceleration / 40) * _level * this.acceleration,
          0,
          Math.cos(this.lifeTime.current * this.acceleration / 40) * _level * this.acceleration
        ),
        rotation: new THREE.Vector3(
          this.acceleration / 20,
          this.acceleration / 20,
          0
        ),
        scale: new THREE.Vector3(_level, _level, _level)
      };
      const _updatedTransform = this.setTransformToView(this.view, this.transform, _velocity);
      
      this.transform.rotation = _updatedTransform.rotation;
    }

    setTransformToView(_view, _transform, _velocity)
    {
      const { position, rotation, scale } = _transform;
      
      ['x', 'y', 'z'].forEach(_key =>{
        _view.position[_key] = position[_key] + _velocity.position[_key];
        _view.rotation[_key] = rotation[_key] + _velocity.rotation[_key];
        _view.scale[_key] = scale[_key] + _velocity.scale[_key];
      });

      return _view;
    }

    destroy()
    {
      if(this.geometry != null){ this.geometry.dispose(); }
      if(this.material != null){ this.material.dispose(); }
      if(this.texture != null){ this.texture.dispose(); }
      if(this.mesh != null){ this.mesh.dispose(); }
    }

  }
})();

/*
* TimerView
*/

WebGLMyApps.Module.View.TimerView = (()=>
{
  return class TimerView extends WebGLMyApps.Module.View.ThreejsActorsViewBase
  {
    constructor()
    {
      super();
      
      const MATERIAL_PARAMETER = {
        blending: THREE.NormalBlending,
        color: 0xffeedd,
        opacity: 0.8,
        transparent: true
      };
      const _scale = 4;

      this.geometry = new THREE.BoxGeometry(_scale, _scale, _scale);
      this.material = new THREE.MeshBasicMaterial(MATERIAL_PARAMETER);
      this.view = new THREE.Mesh(this.geometry, this.material);
      
      this.acceleration = 0.5;
      this.transform = {
        position: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Vector3(0, 0, 0),
        scale: new THREE.Vector3(_scale, _scale, _scale),
      };
      this.timerController = null;
      this.enable = false;
    }

    init()
    {
      super.init();

      this.timerController = new WebGLMyApps.Module.Utils.TimerController();
      setTimeout(()=>{ this.enable = true; }, 4000);
    }

    update(_props)
    {
      super.update(_props);

      let _texture = null; 

      this.timerController.update();
      _texture = this.timerController.getViewAsTexture();
      
      this.view.material.opacity -= 0.04;

      if(_texture != null)
      {
        this.view.material.opacity = 0.8;
        this.view.material.map = _texture;
      }
    }

    updateMotion(_props, position, rotation, scale)
    {
      
      const _level = this.enable ? _props.level / 1000 : 3;
      const _velocity = {
        position: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Vector3(
          // this.acceleration / 20,
          0,
          this.acceleration / 20,
          0
        ),
        scale: new THREE.Vector3(_level, _level, _level)
      };

      const _updatedTransform = this.setTransformToView(this.view, this.transform, _velocity);
      
      this.transform.rotation = _updatedTransform.rotation;
    }
  }
})();

/*
* MiscellaneousView
*/

WebGLMyApps.Module.View.MiscellaneousView = (()=>
{
  return class MiscellaneousView extends WebGLMyApps.Module.View.ThreejsActorsViewBase
  {
    constructor()
    {
      super();

      const _r = this.getRandomRange;
      const MATERIAL_PARAMETER = {
        color: 0xffffff * _r(),
        blending: THREE.AdditiveBlending,
        opacity: 0.9,
        transparent: true
      };
      const _scale = _r() + 1;

      this.geometry = new THREE.BoxGeometry(_scale, _scale, _scale);
      this.material = new THREE.MeshStandardMaterial(MATERIAL_PARAMETER);
      this.view = new THREE.Mesh(this.geometry, this.material);
      this.acceleration = _r() + 1;
      this.transform = {
        position: new THREE.Vector3(_r(-10, 10), _r(-10, 10), _r(-10, 10)),
        rotation: new THREE.Vector3(_r(0, 360), _r(0, 360), _r(0, 360)),
        scale: new THREE.Vector3(_scale, _scale, _scale),
      }
    }
  }
})();

/*
* TimeController
*/

WebGLMyApps.Module.Utils.TimerController = (()=>
{
  return class TimerController extends WebGLMyApps.Module.ModuleBase
  {
    constructor()
    {
      super();

      this.current = "";
      this.isUpdated = false;
      this.props = {
        view: {
          canvas: null,
          context: null,
          font: 'Times new roman',
          fillStyle: 'rgba(255, 255, 255, 255)',
          textBaseline: 'top',
          size: 60,
          x: 0,
          y: 0,
          width: 256,
          height: 256
        }
      }

      this.init();
    }

    init()
    {
      let { canvas, context, font, fillStyle, textBaseline, size, x, y, width, height } = this.props.view;

      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      context = canvas.getContext('2d');
      context.font = `${size}px ${font}`;
      context.textBaseline = textBaseline;
      context.fillStyle = fillStyle;
      x = width / 2 - size * 1.75;
      y = height / 2 - size / 2;

      this.props.view = { canvas, context, font, fillStyle, textBaseline, size, x, y, width, height };
    }

    update()
    {
      const { context, x, y, width, height } = this.props.view;
      const _text = this.getCurrentTime();

      if(this.current === _text){ return; }

      this.current = _text;
      this.isUpdated = true;

      context.clearRect(0, 0, width, height);
      context.fillText(_text, x, y);
    }

    getCurrentTime()
    {
      const _date = new Date();
      const _hour = (_date.getHours() > 9)? _date.getHours() : '0'+_date.getHours();
      const _minute = (_date.getMinutes() > 9)? _date.getMinutes() : '0'+_date.getMinutes();
      const _second = (_date.getSeconds() > 9)? _date.getSeconds() : '0'+_date.getSeconds();

      return `${_hour}:${_minute}:${_second}`;
    }

    getViewAsTexture()
    {
      if(!this.isUpdated){ return null; }

      const _texture = new THREE.CanvasTexture(this.props.view.canvas);
      _texture.needsUpdate = true;
      this.isUpdated = false;

      return _texture;
    }
  }
})();

/*
* AudioController
*/

WebGLMyApps.Module.Utils.AudioController = ((AudioContext) =>
{
  return class AudioController extends WebGLMyApps.Module.ModuleBase
  {
    constructor()
    {
      super();

      this.enable = false;
      this.isLoading = true;
      this.level = 0;
      this.audioProps = {
        sourceRoot: './assets/audio/',
        musicList: [
          {
            name: 'Ringin’',
            author: 'Mr.Kimy',
            url: 'http://dova-s.jp/bgm/play4331.html',
            source: 'Ringin-f.mp3'
          },
          {
            name: 'The Cope Of Night',
            author: 'taron',
            url: 'http://dova-s.jp/bgm/play4980.html',
            source: 'The_Cope_Of_Night.mp3'
          },
          {
            name: 'haze',
            author: 'Choco Mint',
            url: 'http://dova-s.jp/bgm/play6376.html',
            source: 'haze.mp3'
          },
          {
            name: 'chill the sun',
            author: 'gimgigam',
            url: 'http://dova-s.jp/bgm/play6521.html',
            source: 'chill_the_sun.mp3'
          },
        ],
        current: 0        
      };
      
      this.context = new AudioContext();   
      this.source = null;   
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.connect(this.context.destination);
      this.onMusicChanged = ()=>{};
    }

    init(_callback)
    {
      this.loadAsset(0, true, _callback);
    }

    getLevel()
    {
      return this.level;
    }

    getAudioBuffer(_url, _callback)
    {
      const _request = new XMLHttpRequest();
      _request.responseType = 'arraybuffer';

      _request.onreadystatechange = ()=>
      {
        if (_request.readyState === 4) {
          if (_request.status === 0 || _request.status === 200) {
            this.context.decodeAudioData(_request.response, (_buffer)=>
            {
              _callback(_buffer);
            });
          }
        }
      };
      _request.open('GET', _url, true);
      _request.send('');
    }

    addMusicChangedEvent(_sender, _callback)
    {
      this.onMusicChanged = _callback.bind(_sender);
    }

    play(_buffer)
    {
      if(this.source != null)
      {
        this.source.stop();
        this.source = null;
      }
      this.source = this.context.createBufferSource();
      
      this.source.buffer = _buffer;
      this.source.loop = true;
      this.source.connect(this.analyser);
      this.source.start(0);

    }

    update()
    {
      if(!this.enable){ return 0; }
      
      let _spectrums = new Uint8Array(this.analyser.frequencyBinCount);
      let _level = 0;

      this.analyser.getByteFrequencyData(_spectrums);
      _spectrums.forEach(_value => _level += _value);

      this.level = _level;

      return _level;
    }

    loadAsset(_index = 0, _isAutoPlay = true, _callback = null)
    {
      const { sourceRoot, musicList } = this.audioProps;
      
      if(_index >=  musicList.length)
      {
        this.audioProps.current = _index = 0;
      }

      this.isLoading = true;

      this.getAudioBuffer(sourceRoot + musicList[_index].source, (_buffer)=>
      {
        this.enable = true;
        this.isLoading = false;
        if(_isAutoPlay)
        {
          this.play(_buffer);
        }
        if(_callback != null)
        {
          _callback();
        }
        this.onMusicChanged(this.audioProps.musicList[this.audioProps.current]);
      });      
    }

    getInfo()
    {
      return this.audioProps.musicList[this.audioProps.current];
    }

    onKeyDown(e)
    {
      if(e.keyCode === 32 && !this.isLoading)
      {
        this.loadAsset(++this.audioProps.current);
      }
    }
};
})(window.AudioContext || window.webkitAudioContext);

/*
* OverlayInformationViewController
*/

WebGLMyApps.Module.OverlayInformationViewController = (()=>
{
  return class ActorsContOverlayInformationViewController extends WebGLMyApps.Module.ModuleBase
  {
    constructor()
    {
      super();

      this.container = null;
      this.info = {
        music: null,
        time: null        
      }

      this.init();
    }

    init()
    {
      this.container = document.getElementById('info__container');
      this.info.music = document.getElementById('info__music');
      this.info.time = document.getElementById('info__time');

    }

    update(_props = null)
    {
      if(_props == null){ return; }

      this.info.time.textContent = _props.time;
    }

    onMusicChangedHandler(e)
    {
      this.info.music.innerHTML = `${e.name} / ${e.author} <a href="${e.url}" target="_blank">(Source from DOVA-SYNDROME)</a>`;     
    }
  }
})();