/**
 * This script defines different import options for loading 3dm models into the scene. Call the preferred function in model.js to return the 3dm model as an object to be added into the scene.
 */

// Modules Imports
import * as THREE from "three"; //Used for text complete, replace this with unpkg module on build
//import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';
import { Rhino3dmLoader } from "https://unpkg.com/three@0.164.1/examples/jsm/loaders/3DMLoader.js";
import { UIElements } from "../../main";

const loader = new Rhino3dmLoader();
loader.setLibraryPath("https://cdn.jsdelivr.net/npm/rhino3dm@8.6.1/");

const testUI = UIElements().fb;
console.log(testUI);
// 3DM Loader functions

/**
 * Fetch3DM:
 * Loads 3dm model and returns model children and materials. Takes arguments to set if model receives or casts shadows.
 *
 * General Notes:
 * This function returns information and geometry within the target 3dm file. The goals of this function is to return key information such as
 * - Geometry
 * - Geometry, sorted by layer or group
 * - Materials applied to geometry (but not unused materials to reduce load time)
 *
 * @param {string} url string: filepath
 * @param {bool} castShadow  bool: True to cast shadows
 * @param {bool} receiveShadow boo: True to receive shadows
 * @returns dict: object(obj), averageCenter(Vector3)
 */
export default async function Fetch3DM(url, castShadow, receiveShadow) {
  return new Promise(
    (resolve, reject) => {
      let objects, object;
      objects = [];
      object = {
        object: null, // Object
        children: null, // Array
        material: null, // Array
      };

      loader.load(url, function (object) {
        let meshs = [];
        let lines = [];
        let geometry = [];
        let avgCenter;
        avgCenter = {
          x: 0,
          y: 0,
          z: 0,
        };
        object.up = new THREE.Vector3(0, 0, 1);

        console.log(object);

        function ConstructLayerTable() {
          /**
           * Recursively lookup layers in model and store layers in dict referencing to main layer    TODO: Revise to Class Obj?
           * Ideas:
           * Check if "::" is NOT in layer name, if true this means that layer is a main layer  -> MainLayers
           * Check all layers to find if main layer matches and only one "::" occurs, and write to secondary layer       -> SecondLayers
           */
          const layers = object.userData.layers;
          const layerTree = [];
          const mainLayers = [];

          layers.forEach((layer, i) => {
            console.log(layer);
            console.log(i);
            if (!layer.fullPath.includes("::")) {
              mainLayers.push(layer.name);
            }
          });

          mainLayers.forEach((layer) => {
            const layerDict = {
              parent: layer,
              subLayers: [],
            };
            layers.forEach((item) => {
              if (item.fullPath === layer) {
                layerDict.main = item;
              } else if (item.fullPath.includes(layer)) {
                layerDict.subLayers.push(item);
              }
            });
            layerTree.push(layerDict);
          });
          console.log(layerTree);
        }
        ConstructLayerTable();

        function LayerSort() {
          const modelLayers = object.userData.layers;
          const LayerSort = [];
          modelLayers.forEach((layer, i) => {
            const layerChildren = [];
            object.children.forEach((child) => {
              if (child.userData.attributes.layerIndex === i) {
                layerChildren.push(child);
              }
            });
            LayerSort.push(layerChildren);
          });

          return LayerSort;
        }
        const layerSort = LayerSort();
        console.log(layerSort);

        function GroupSort() {
          const modelGroups = object.userData.groups;
          const GroupSort = [];
          modelGroups.forEach((group, i) => {
            const groupChildren = [];
            object.children.forEach((child) => {
              if (child.userData.attributes.groupIds !== undefined) {
                child.userData.attributes.groupIds.forEach((id) => {
                  if (id === i) {
                    groupChildren.push(child);
                  }
                });
              }
            });
            GroupSort.push(groupChildren);
          });

          return GroupSort;
        }
        const groupSort = GroupSort();
        console.log(groupSort);

        object.children.forEach((child) => {
          geometry.push(child);
          if (child.type === "Mesh") {
            child.castShadow = castShadow;
            child.receiveShadow = receiveShadow;
            child.geometry.computeBoundingSphere();
            avgCenter.x += child.geometry.boundingSphere.center.x;
            avgCenter.y += child.geometry.boundingSphere.center.y;
            avgCenter.z += child.geometry.boundingSphere.center.z;
            meshs.push(child);
          } else if (child.type === "Line") {
            lines.push(child);
          }
        });

        avgCenter.x = avgCenter.x / object.children.length;
        avgCenter.y = avgCenter.y / object.children.length;
        avgCenter.z = avgCenter.z / object.children.length;

        resolve({
          meshs: meshs,
          lines: lines,
          object: geometry,
          layers: layerSort,
          groups: groupSort,
          averageCenter: avgCenter,
        });
      });
    },
    function (error) {
      reject(error);
      console.log(error);
    }
  );
}
